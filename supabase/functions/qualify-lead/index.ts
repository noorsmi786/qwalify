// ==============================================================================
// Supabase Edge Function: qualify-lead
// Runs conversational qualification using the tenant's configured AI provider
// ==============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { tenantId, leadId, conversationId, incomingMessage, remoteJid, channel, channelMeta } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch Tenant and Active AI Provider Config
    const { data: tenant } = await supabase
      .from("tenants")
      .select("name, settings")
      .eq("id", tenantId)
      .single();

    const { data: aiConfig } = await supabase
      .from("ai_provider_configs")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .maybeSingle();

    if (!aiConfig || !aiConfig.api_key) {
      console.warn("No active AI provider configured for tenant", tenantId);
      return new Response(JSON.stringify({ status: "skipped_no_ai_key" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Fetch Lead & Conversation History
    const { data: lead } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    const { data: history } = await supabase
      .from("messages")
      .select("sender, content, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(15);

    // 3. Build System Prompt & Call AI Provider
    const companyName = tenant?.name || "Our Company";
    const systemPrompt = `You are "Qwalify AI", an elite AI SDR working for "${companyName}".
Prospect: ${lead.full_name}, current score: ${lead.score}/100.
Rules: Be concise (under 3 sentences), friendly, ask 1 question at a time.
At the end of your response, ALWAYS include:
<qualification_json>
{
  "new_score": <number 0-100>,
  "score_reason": "<1 sentence>",
  "is_handoff_ready": <true/false>
}
</qualification_json>`;

    let replyText = "Thanks for your reply! Could you share a bit more about your requirements?";
    let newScore = lead.score;
    let isHandoffReady = false;

    // Call AI (OpenAI / Gemini / Anthropic / Groq)
    if (aiConfig.provider === "gemini") {
      const gUrl = `https://generativelanguage.googleapis.com/v1beta/models/${aiConfig.model || "gemini-1.5-flash"}:generateContent?key=${aiConfig.api_key}`;
      const res = await fetch(gUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: (history || []).map((m: any) => ({
            role: m.sender === "ai" ? "model" : "user",
            parts: [{ text: m.content }],
          })),
        }),
      });
      const gData = await res.json();
      const rawText = gData.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const match = rawText.match(/<qualification_json>([\s\S]*?)<\/qualification_json>/i);
      replyText = rawText.replace(/<qualification_json>[\s\S]*?<\/qualification_json>/gi, "").trim();
      if (match) {
        try {
          const parsed = JSON.parse(match[1]);
          if (typeof parsed.new_score === "number") newScore = parsed.new_score;
          if (typeof parsed.is_handoff_ready === "boolean") isHandoffReady = parsed.is_handoff_ready;
        } catch (_) {}
      }
    } else {
      // Default OpenAI-compatible endpoint (Groq, OpenAI, OpenRouter, etc.)
      let ep = "https://api.openai.com/v1/chat/completions";
      if (aiConfig.provider === "groq") ep = "https://api.groq.com/openai/v1/chat/completions";
      if (aiConfig.provider === "openrouter") ep = "https://openrouter.ai/api/v1/chat/completions";

      const res = await fetch(ep, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${aiConfig.api_key}`,
        },
        body: JSON.stringify({
          model: aiConfig.model,
          messages: [
            { role: "system", content: systemPrompt },
            ...(history || []).map((m: any) => ({
              role: m.sender === "ai" ? "assistant" : "user",
              content: m.content,
            })),
          ],
        }),
      });
      const oData = await res.json();
      const rawText = oData.choices?.[0]?.message?.content || "";
      const match = rawText.match(/<qualification_json>([\s\S]*?)<\/qualification_json>/i);
      replyText = rawText.replace(/<qualification_json>[\s\S]*?<\/qualification_json>/gi, "").trim();
      if (match) {
        try {
          const parsed = JSON.parse(match[1]);
          if (typeof parsed.new_score === "number") newScore = parsed.new_score;
          if (typeof parsed.is_handoff_ready === "boolean") isHandoffReady = parsed.is_handoff_ready;
        } catch (_) {}
      }
    }

    // 4. Save Outbound AI Message
    await supabase.from("messages").insert({
      tenant_id: tenantId,
      conversation_id: conversationId,
      lead_id: leadId,
      sender: "ai",
      content: replyText,
      channel: "whatsapp",
    });

    // 5. Update Lead Score & Status
    let nextStatus = lead.status;
    if (newScore >= 75) nextStatus = "hot";
    else if (newScore >= 45) nextStatus = "warm";

    await supabase
      .from("leads")
      .update({
        score: newScore,
        status: nextStatus,
        is_handoff_ready: isHandoffReady || newScore >= 75,
        last_contact_at: new Date().toISOString(),
      })
      .eq("id", leadId);

    // 6. Record Qualification Score Event
    await supabase.from("qualification_scores").insert({
      tenant_id: tenantId,
      lead_id: leadId,
      score: newScore,
      reason: "Automated AI conversational qualification turn",
    });

    // 7. Send Outbound message via appropriate channel adapter
    const incomingChannel = channel || lead.source_channel || "whatsapp";

    if (incomingChannel === "whatsapp") {
      const { data: channelConn } = await supabase
        .from("channel_connections")
        .select("config")
        .eq("tenant_id", tenantId)
        .eq("channel", "whatsapp")
        .maybeSingle();

      if (channelConn?.config?.api_url && channelConn?.config?.api_key && remoteJid) {
        await fetch(`${channelConn.config.api_url}/message/sendText/${channelConn.config.instance_name || "default"}`, {
          method: "POST",
          headers: {
            apikey: channelConn.config.api_key,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            number: remoteJid,
            options: { delay: 1200, presence: "composing" },
            textMessage: { text: replyText },
          }),
        }).catch((e) => console.error("WhatsApp outbound failed:", e));
      }
    } else if (incomingChannel === "telegram") {
      const { data: tgConn } = await supabase
        .from("channel_connections")
        .select("config")
        .eq("tenant_id", tenantId)
        .eq("channel", "telegram")
        .maybeSingle();

      const chatId = channelMeta?.chat_id;
      if (tgConn?.config?.bot_token && chatId) {
        await fetch(`https://api.telegram.org/bot${tgConn.config.bot_token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: replyText,
            parse_mode: "Markdown",
          }),
        }).catch((e) => console.error("Telegram outbound failed:", e));
      }
    }

    return new Response(JSON.stringify({ success: true, reply: replyText, newScore }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Qualify error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
