// ==============================================================================
// Supabase Edge Function: whatsapp-webhook
// Receives Evolution API / Meta WABA webhooks and processes incoming messages
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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    console.log("Received WhatsApp Webhook Payload:", JSON.stringify(body));

    // Evolution API Webhook format
    const event = body.event; // e.g. "messages.upsert"
    const data = body.data;

    if (event === "messages.upsert" && data?.key && !data.key.fromMe) {
      const senderPhone = data.key.remoteJid?.replace("@s.whatsapp.net", "") || "";
      const pushName = data.pushName || "WhatsApp Contact";
      const messageText = data.message?.conversation || data.message?.extendedTextMessage?.text || "";
      const instanceName = body.instance || "default";

      // 1. Identify Tenant by instance name / connection
      const { data: connection } = await supabase
        .from("channel_connections")
        .select("tenant_id")
        .eq("channel", "whatsapp")
        .filter("config->>instance_name", "eq", instanceName)
        .maybeSingle();

      const tenantId = connection?.tenant_id;
      if (!tenantId) {
        console.warn(`No tenant found for instance ${instanceName}`);
        return new Response(JSON.stringify({ status: "ignored_no_tenant" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 2. Upsert Lead
      let { data: lead } = await supabase
        .from("leads")
        .select("id, full_name, status, score")
        .eq("tenant_id", tenantId)
        .eq("contact", senderPhone)
        .maybeSingle();

      if (!lead) {
        const { data: newLead, error: leadErr } = await supabase
          .from("leads")
          .insert({
            tenant_id: tenantId,
            full_name: pushName,
            contact: senderPhone,
            source_channel: "whatsapp",
            status: "qualifying",
            score: 10,
          })
          .select()
          .single();

        if (leadErr) throw leadErr;
        lead = newLead;
      }

      // 3. Upsert Conversation
      let { data: conversation } = await supabase
        .from("conversations")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("lead_id", lead.id)
        .eq("channel", "whatsapp")
        .maybeSingle();

      if (!conversation) {
        const { data: newConv } = await supabase
          .from("conversations")
          .insert({
            tenant_id: tenantId,
            lead_id: lead.id,
            channel: "whatsapp",
            channel_thread_id: data.key.remoteJid,
          })
          .select()
          .single();
        conversation = newConv;
      }

      // 4. Save Inbound Message
      await supabase.from("messages").insert({
        tenant_id: tenantId,
        conversation_id: conversation.id,
        lead_id: lead.id,
        sender: "lead",
        content: messageText,
        channel: "whatsapp",
        raw_payload: body,
      });

      // 5. Trigger Qualify Edge Function Asynchronously
      fetch(`${supabaseUrl}/functions/v1/qualify-lead`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tenantId,
          leadId: lead.id,
          conversationId: conversation.id,
          incomingMessage: messageText,
          remoteJid: data.key.remoteJid,
        }),
      }).catch((e) => console.error("Async qualification trigger failed:", e));
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
