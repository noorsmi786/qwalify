// ==============================================================================
// Supabase Edge Function: process-followups
// Triggered by pg_cron every hour.
// Scans all overdue follow-up leads and sends messages via their channel.
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

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, supabaseKey);

  const results: { leadId: string; status: string }[] = [];

  try {
    // 1. Fetch all overdue follow-up states
    const { data: dueStates, error } = await supabase
      .from("lead_followup_state")
      .select(`
        *,
        leads (id, full_name, contact, status, source_channel, tenant_id),
        follow_up_sequences (
          id, tenant_id,
          phase1_message_template, phase2_message_template, cool_message_template,
          phase1_days, phase1_interval, phase2_weeks, phase2_interval
        )
      `)
      .lte("next_followup_at", new Date().toISOString())
      .eq("paused", false)
      .in("current_phase", [1, 2])   // Phase 3 = cooled, no action needed
      .limit(100);

    if (error) throw error;
    if (!dueStates || dueStates.length === 0) {
      return new Response(JSON.stringify({ processed: 0, message: "No follow-ups due." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing ${dueStates.length} overdue follow-up states`);

    for (const state of dueStates) {
      const lead = state.leads as any;
      const seq  = state.follow_up_sequences as any;

      if (!lead || !seq) continue;

      // Skip leads that have been handed off, booked, or cooled already
      if (["booked", "cooled", "handoff"].includes(lead.status)) {
        await supabase
          .from("lead_followup_state")
          .update({ paused: true, paused_reason: `Lead status is ${lead.status}`, updated_at: new Date().toISOString() })
          .eq("id", state.id);
        results.push({ leadId: lead.id, status: `skipped_${lead.status}` });
        continue;
      }

      const tenantId = lead.tenant_id;

      // 2. Resolve which template to use
      const templateRaw: string =
        state.current_phase === 1
          ? seq.phase1_message_template
          : seq.phase2_message_template;

      // 3. Load tenant name for variable substitution
      const { data: tenant } = await supabase
        .from("tenants")
        .select("name")
        .eq("id", tenantId)
        .single();

      const message = interpolateTemplate(templateRaw, {
        lead_name:    lead.full_name?.split(" ")[0] || "there",
        company_name: tenant?.name || "our company",
      });

      // 4. Send via the lead's source channel
      let sent = false;
      if (lead.source_channel === "whatsapp") {
        sent = await sendWhatsAppMessage(supabase, tenantId, lead.contact, message);
      } else {
        // Channels not yet wired: log but mark as sent for sequence advancement
        console.log(`Follow-up for ${lead.source_channel} channel not yet implemented, logging only.`);
        sent = true;
      }

      if (!sent) {
        // Record failed event
        await supabase.from("follow_up_events").insert({
          tenant_id:     tenantId,
          lead_id:       lead.id,
          sequence_id:   seq.id,
          phase:         state.current_phase,
          attempt_number: state.attempt_number + 1,
          scheduled_for: state.next_followup_at,
          status:        "failed",
          error_message: "Channel send failed",
        });
        results.push({ leadId: lead.id, status: "send_failed" });
        continue;
      }

      // 5. Log the sent event
      await supabase.from("follow_up_events").insert({
        tenant_id:     tenantId,
        lead_id:       lead.id,
        sequence_id:   seq.id,
        phase:         state.current_phase,
        attempt_number: state.attempt_number + 1,
        scheduled_for: state.next_followup_at,
        sent_at:       new Date().toISOString(),
        status:        "sent",
      });

      // 6. Save message to conversation
      const { data: conv } = await supabase
        .from("conversations")
        .select("id")
        .eq("lead_id", lead.id)
        .maybeSingle();

      if (conv?.id) {
        await supabase.from("messages").insert({
          tenant_id:       tenantId,
          conversation_id: conv.id,
          lead_id:         lead.id,
          sender:          "ai",
          content:         message,
          channel:         lead.source_channel,
        });
      }

      // 7. Advance the sequence state via DB function
      const { data: advResult } = await supabase.rpc("advance_lead_followup", {
        p_lead_id: lead.id,
      });

      results.push({ leadId: lead.id, status: (advResult as any)?.status || "advanced" });
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    console.error("process-followups error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

// ─── Helpers ───────────────────────────────────────────────────────────────────

function interpolateTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

async function sendWhatsAppMessage(
  supabase: any,
  tenantId: string,
  contact: string,
  message: string
): Promise<boolean> {
  const { data: conn } = await supabase
    .from("channel_connections")
    .select("config")
    .eq("tenant_id", tenantId)
    .eq("channel", "whatsapp")
    .maybeSingle();

  if (!conn?.config?.api_url || !conn?.config?.api_key) return false;

  try {
    const res = await fetch(
      `${conn.config.api_url}/message/sendText/${conn.config.instance_name || "default"}`,
      {
        method: "POST",
        headers: {
          apikey: conn.config.api_key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          number: contact,
          options: { delay: 1000, presence: "composing" },
          textMessage: { text: message },
        }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}
