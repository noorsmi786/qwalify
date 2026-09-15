// ==============================================================================
// Supabase Edge Function: telegram-webhook
// Receives Telegram Bot webhook events and feeds them into the qualification engine
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    console.log("Telegram Webhook:", JSON.stringify(body));

    const message = body.message || body.edited_message;
    if (!message || !message.text) {
      return new Response(JSON.stringify({ ok: true, status: "ignored_no_text" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const chatId    = String(message.chat.id);
    const text      = message.text as string;
    const firstName = message.from?.first_name || "Telegram User";
    const lastName  = message.from?.last_name || "";
    const fullName  = `${firstName} ${lastName}`.trim();
    const username  = message.from?.username ? `@${message.from.username}` : chatId;

    // 1. Identify tenant via bot token in the URL (passed as ?token=xxx) or use first active Telegram connection
    const url = new URL(req.url);
    const botToken = url.searchParams.get("token") ?? "";

    const { data: connection } = await supabase
      .from("channel_connections")
      .select("tenant_id, config")
      .eq("channel", "telegram")
      .filter("config->>bot_token", "eq", botToken)
      .maybeSingle();

    const tenantId = connection?.tenant_id;
    if (!tenantId) {
      console.warn("No tenant found for Telegram token");
      return new Response(JSON.stringify({ ok: true, status: "no_tenant" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Upsert Lead (use chat_id as contact identifier)
    let { data: lead } = await supabase
      .from("leads")
      .select("id, full_name, status, score")
      .eq("tenant_id", tenantId)
      .eq("contact", chatId)
      .maybeSingle();

    if (!lead) {
      const { data: newLead, error } = await supabase
        .from("leads")
        .insert({
          tenant_id:     tenantId,
          full_name:     fullName,
          contact:       chatId,
          source_channel: "telegram",
          status:        "qualifying",
          score:         10,
          metadata:      { telegram_username: username },
        })
        .select()
        .single();
      if (error) throw error;
      lead = newLead;
    }

    // 3. Upsert Conversation
    let { data: conversation } = await supabase
      .from("conversations")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("lead_id", lead.id)
      .eq("channel", "telegram")
      .maybeSingle();

    if (!conversation) {
      const { data: newConv } = await supabase
        .from("conversations")
        .insert({
          tenant_id:        tenantId,
          lead_id:          lead.id,
          channel:          "telegram",
          channel_thread_id: chatId,
        })
        .select()
        .single();
      conversation = newConv;
    }

    // 4. Save inbound message
    await supabase.from("messages").insert({
      tenant_id:       tenantId,
      conversation_id: conversation.id,
      lead_id:         lead.id,
      sender:          "lead",
      content:         text,
      channel:         "telegram",
      raw_payload:     body,
    });

    // 5. Trigger AI qualification asynchronously
    fetch(`${supabaseUrl}/functions/v1/qualify-lead`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tenantId,
        leadId:         lead.id,
        conversationId: conversation.id,
        incomingMessage: text,
        channel:         "telegram",
        channelMeta:     { chat_id: chatId },
      }),
    }).catch((e) => console.error("Async qualify trigger failed:", e));

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Telegram webhook error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
