import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// ─── Email transporter for feedback ───────────────────────────────────────────
const FEEDBACK_EMAIL_TO = process.env.FEEDBACK_EMAIL_TO || 'PLACEHOLDER_EMAIL';
const GMAIL_USER = process.env.GMAIL_USER || '';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || '';

let emailTransporter = null;
if (GMAIL_USER && GMAIL_APP_PASSWORD) {
  emailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
  });
  console.log(`📧 Email feedback configured → ${FEEDBACK_EMAIL_TO}`);
} else {
  console.warn('⚠️  No Gmail credentials set — feedback will be logged to console only');
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT || 3001;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://bmiwzknbsuqxxoeaatnt.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtaXd6a25ic3VxeHhvZWFhdG50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0Njk4MTMsImV4cCI6MjEwNTA0NTgxM30.6x3xf37nQGabBN70H2neyIsXMisZVeLwPfOr7s7IYlA';
const EVOLUTION_URL = process.env.EVOLUTION_URL || 'http://evolution-api-api-1:8080';
const EVOLUTION_API_KEY = (process.env.EVOLUTION_API_KEY && process.env.EVOLUTION_API_KEY.includes('Noor')) ? process.env.EVOLUTION_API_KEY : 'Zainab$1212Noor@1212';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { createClient: false }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'qwalify-webhook-engine', timestamp: new Date().toISOString() });
});
app.get('/webhook/health', (req, res) => {
  res.json({ status: 'ok', service: 'qwalify-webhook-engine', timestamp: new Date().toISOString() });
});
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'qwalify-webhook-engine', timestamp: new Date().toISOString() });
});

// ─── Outbound Webhook Dispatcher ──────────────────────────────────────────────
async function dispatchOutboundWebhook(tenantId, eventName, payload) {
  try {
    const { data: tenant } = await supabase.from('tenants').select('settings').eq('id', tenantId).maybeSingle();
    const webhookUrl = tenant?.settings?.outbound_webhook_url;
    if (webhookUrl && (webhookUrl.startsWith('http://') || webhookUrl.startsWith('https://'))) {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'Qwalify-Outbound-Engine/1.0' },
        body: JSON.stringify({
          event: eventName,
          data: payload,
          timestamp: new Date().toISOString(),
        }),
      });
      console.log(`[Webhook] Dispatched ${eventName} to ${webhookUrl}`);
    }
  } catch (err) {
    console.warn('[Webhook Error]:', err.message);
  }
}

// ─── Telegram Dispatcher for Rep Notifications ────────────────────────────────
async function sendTelegramAlert({ token, chatId, text }) {
  if (!token || !chatId || !text) {
    console.warn('[Telegram Alert Skipped] Missing token or chatId');
    return false;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    });
    const data = await res.json();
    if (data?.ok) {
      console.log(`[Telegram Alert Sent] to Chat ID: ${chatId}`);
      return true;
    } else {
      console.warn('[Telegram Alert API Error]:', data?.description);
      return false;
    }
  } catch (err) {
    console.error('[Telegram Alert Exception]:', err.message);
    return false;
  }
}

// ─── Get Tenant Rep Settings (Telegram & WhatsApp) ──────────────────────────
async function getTenantRepSettings(tenantId) {
  try {
    // 1. Check channel_connections for rep_handoff_settings
    const { data: handoffConn } = await supabase
      .from('channel_connections')
      .select('config')
      .eq('tenant_id', tenantId)
      .eq('channel', 'rep_handoff_settings')
      .maybeSingle();

    if (handoffConn?.config) {
      const c = handoffConn.config;
      return {
        telegramEnabled: c.telegram_enabled ?? true,
        handle: c.telegram_chat_id || '',
        botToken: c.telegram_bot_token || process.env.TELEGRAM_BOT_TOKEN,
        whatsAppEnabled: c.whatsapp_enabled ?? false,
        whatsAppRepPhone: c.whatsapp_rep_phone || '',
        alertOnHotScore: c.alert_on_hot_score ?? true,
        alertOnManualFlag: c.alert_on_manual_flag ?? true,
      };
    }

    // 2. Check rep_settings table if exists
    const { data: repRow } = await supabase
      .from('rep_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .maybeSingle();

    if (repRow?.notification_handle) {
      return {
        telegramEnabled: repRow.notification_channel === 'telegram',
        handle: repRow.notification_handle,
        botToken: repRow.bot_token || process.env.TELEGRAM_BOT_TOKEN,
        whatsAppEnabled: repRow.notification_channel === 'whatsapp',
        whatsAppRepPhone: repRow.notification_channel === 'whatsapp' ? repRow.notification_handle : '',
      };
    }

    // 3. Check tenant settings
    const { data: tenant } = await supabase
      .from('tenants')
      .select('settings')
      .eq('id', tenantId)
      .maybeSingle();

    const repSettings = tenant?.settings?.rep_settings;
    return {
      telegramEnabled: repSettings?.telegram_enabled ?? true,
      handle: repSettings?.telegram_chat_id || tenant?.settings?.rep_telegram_chat_id || process.env.REP_TELEGRAM_CHAT_ID,
      botToken: repSettings?.telegram_bot_token || tenant?.settings?.telegram_bot_token || process.env.TELEGRAM_BOT_TOKEN,
      whatsAppEnabled: repSettings?.whatsapp_enabled ?? false,
      whatsAppRepPhone: repSettings?.whatsapp_rep_phone || '',
    };
  } catch {
    return {
      telegramEnabled: true,
      handle: process.env.REP_TELEGRAM_CHAT_ID,
      botToken: process.env.TELEGRAM_BOT_TOKEN,
      whatsAppEnabled: false,
      whatsAppRepPhone: '',
    };
  }
}

// ─── Trigger Human Handoff Core Logic ─────────────────────────────────────────
async function triggerHumanHandoff({ tenantId, lead, reason = 'auto_hot_score', repId = null, conversationId = null }) {
  try {
    console.log(`[Human Handoff] Triggered for lead ${lead.full_name} (${lead.id}), reason: ${reason}`);

    // 1. Pause bot on lead and conversation
    await supabase.from('leads').update({
      bot_paused: true,
      is_handoff_ready: true,
      last_contact_at: new Date().toISOString(),
    }).eq('id', lead.id);

    if (conversationId) {
      await supabase.from('conversations').update({ state: 'paused' }).eq('id', conversationId);
    } else {
      await supabase.from('conversations').update({ state: 'paused' }).eq('lead_id', lead.id);
    }

    // 2. Generate summary
    const summary = `${lead.full_name} inquiry on ${lead.source_channel || 'WhatsApp'} (Score: ${lead.score || 75}/100) — Hot Lead handed off to human rep.`;

    // 3. Create handoff_events record
    await supabase.from('handoff_events').insert({
      tenant_id: tenantId,
      lead_id: lead.id,
      conversation_id: conversationId || undefined,
      reason,
      status: 'pending',
      assigned_rep_id: repId,
      trigger_score: lead.score || 75,
      summary,
      notes: JSON.stringify({ summary, auto_paused: true, source: lead.source_channel }),
    }).catch((e) => console.warn('[Handoff Event Insert Warn]:', e.message));

    // 4. Dispatch Telegram alert to rep if configured
    const repSettings = await getTenantRepSettings(tenantId);
    const dashboardLink = `https://qwalify.online/leads/${lead.id}`;
    const alertText = `🔥 <b>Hot Lead Alert: ${lead.full_name}</b> (${lead.source_channel || 'WhatsApp'})
<b>Score:</b> ${lead.score || 75}/100
<b>Summary:</b> ${summary}

👉 <b>Reply to this message</b> to text the lead directly, or <a href="${dashboardLink}">open dashboard</a>.
To resume AI bot, send <code>/resolve</code>`;

    if (repSettings?.telegramEnabled && repSettings?.handle && repSettings?.botToken) {
      await sendTelegramAlert({
        token: repSettings.botToken,
        chatId: repSettings.handle,
        text: alertText,
      });
    }

    // 4b. Dispatch WhatsApp alert to rep if enabled
    if (repSettings?.whatsAppEnabled && repSettings?.whatsAppRepPhone) {
      const { data: waConn } = await supabase
        .from('channel_connections')
        .select('config')
        .eq('tenant_id', tenantId)
        .eq('channel', 'whatsapp')
        .maybeSingle();

      const instanceName = waConn?.config?.instance_name || 'qwalify-main';
      const cleanPhone = repSettings.whatsAppRepPhone.replace(/\D/g, '');
      const waAlertText = `🔥 *Hot Lead Alert: ${lead.full_name}* (${lead.source_channel || 'WhatsApp'})\n*Score:* ${lead.score || 75}/100\n*Summary:* ${summary}\n\n👉 Open dashboard to respond: ${dashboardLink}`;

      try {
        await fetch(`${EVOLUTION_URL}/message/sendText/${instanceName}`, {
          method: 'POST',
          headers: {
            apikey: EVOLUTION_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            number: cleanPhone,
            text: waAlertText,
          }),
        });
        console.log(`[WhatsApp Rep Alert Sent] to ${cleanPhone}`);
      } catch (waErr) {
        console.warn('[WhatsApp Rep Alert Error]:', waErr.message);
      }
    }

    // 5. Fire outbound webhook
    await dispatchOutboundWebhook(tenantId, 'lead.handoff', {
      leadId: lead.id,
      leadName: lead.full_name,
      reason,
      score: lead.score,
    });
  } catch (err) {
    console.error('[Human Handoff Error]:', err);
  }
}

// ─── Feedback Endpoint ─────────────────────────────────────────────────────────
app.post('/api/feedback', async (req, res) => {
  try {
    const { type, message, userEmail, userName, workspace, submittedAt } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'Message is required' });

    const typeEmoji = { bug: '🐛', suggestion: '💡', compliment: '🌟', other: '💬' }[type] || '💬';
    const subject = `${typeEmoji} Qwalify Feedback [${(type || 'other').toUpperCase()}] from ${userName || userEmail}`;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #7c3aed;">New Qwalify Feedback ${typeEmoji}</h2>
        <table style="border-collapse: collapse; width: 100%;">
          <tr><td style="padding: 8px; font-weight: bold; color: #666;">Type</td><td style="padding: 8px;">${type}</td></tr>
          <tr style="background: #f9f9f9;"><td style="padding: 8px; font-weight: bold; color: #666;">From</td><td style="padding: 8px;">${userName || 'Anonymous'} (${userEmail})</td></tr>
          <tr><td style="padding: 8px; font-weight: bold; color: #666;">Workspace</td><td style="padding: 8px;">${workspace || 'N/A'}</td></tr>
          <tr style="background: #f9f9f9;"><td style="padding: 8px; font-weight: bold; color: #666;">Submitted</td><td style="padding: 8px;">${new Date(submittedAt).toLocaleString()}</td></tr>
        </table>
        <div style="margin-top: 20px; padding: 16px; background: #f5f5f5; border-left: 4px solid #7c3aed; border-radius: 4px;">
          <p style="margin: 0; white-space: pre-wrap; color: #333;">${message}</p>
        </div>
      </div>
    `;

    console.log(`[Feedback] ${type} from ${userEmail}: "${message.slice(0, 80)}"`);

    if (emailTransporter) {
      await emailTransporter.sendMail({
        from: `"Qwalify Feedback" <${GMAIL_USER}>`,
        to: FEEDBACK_EMAIL_TO,
        subject,
        html,
      });
      console.log(`[Feedback] Email sent to ${FEEDBACK_EMAIL_TO}`);
    }

    res.json({ status: 'received' });
  } catch (err) {
    console.error('[Feedback Error]:', err);
    res.status(500).json({ error: 'Failed to process feedback' });
  }
});

// ─── Human Handoff API Endpoints ──────────────────────────────────────────────
app.post('/api/handoff/trigger', async (req, res) => {
  try {
    const { leadId, tenantId, reason, repId } = req.body;
    if (!leadId) return res.status(400).json({ error: 'leadId is required' });

    const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).maybeSingle();
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const targetTenantId = tenantId || lead.tenant_id;
    await triggerHumanHandoff({
      tenantId: targetTenantId,
      lead,
      reason: reason || 'manual_flag',
      repId,
    });

    res.json({ success: true, status: 'handoff_triggered', bot_paused: true });
  } catch (err) {
    console.error('[Handoff Trigger API Error]:', err);
    res.status(500).json({ error: err.message || 'Failed to trigger handoff' });
  }
});

app.post('/api/handoff/resolve', async (req, res) => {
  try {
    const { leadId, tenantId } = req.body;
    if (!leadId) return res.status(400).json({ error: 'leadId is required' });

    // 1. Resume bot on lead
    await supabase.from('leads').update({
      bot_paused: false,
      is_handoff_ready: false,
      last_contact_at: new Date().toISOString(),
    }).eq('id', leadId);

    // 2. Resume conversation
    await supabase.from('conversations').update({ state: 'active' }).eq('lead_id', leadId);

    // 3. Mark handoff_event resolved
    await supabase.from('handoff_events').update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
    }).eq('lead_id', leadId).eq('status', 'pending');

    console.log(`[Human Handoff Resolved] Lead ${leadId}, bot resumed.`);
    res.json({ success: true, status: 'resolved', bot_paused: false });
  } catch (err) {
    console.error('[Handoff Resolve API Error]:', err);
    res.status(500).json({ error: err.message || 'Failed to resolve handoff' });
  }
});

// ─── Test Alert Endpoint (Sends Immediate Test to Rep Telegram) ───────────────
app.post('/api/handoff/test-alert', async (req, res) => {
  try {
    const { botToken, chatId, repName } = req.body;
    if (!botToken || !chatId) {
      return res.status(400).json({ error: 'botToken and chatId are required' });
    }

    const testText = `🔥 <b>[TEST NOTIFICATION] Qwalify Human Handoff</b>
<b>Rep:</b> ${repName || 'Sales Rep'}
<b>Status:</b> ✅ Successfully connected!

When a hot prospect (score ≥ 75) is qualified or manually claimed, you will receive real-time alerts right here.
You can reply directly in this chat to text the customer on WhatsApp.`;

    const sent = await sendTelegramAlert({
      token: botToken.trim(),
      chatId: String(chatId).trim(),
      text: testText,
    });

    if (sent) {
      res.json({ success: true, ok: true, message: 'Test alert delivered' });
    } else {
      res.status(400).json({ error: 'Failed to send alert. Please verify your Bot Token and Chat ID.' });
    }
  } catch (err) {
    console.error('[Test Alert Error]:', err);
    res.status(500).json({ error: err.message || 'Error dispatching test alert' });
  }
});

// ─── Test WhatsApp Alert Endpoint (Sends Immediate Test to Rep WhatsApp) ───────
app.post('/api/handoff/test-whatsapp-alert', async (req, res) => {
  try {
    const { tenantId, repPhone, instanceName } = req.body;
    if (!repPhone) {
      return res.status(400).json({ error: 'repPhone is required' });
    }

    let targetInstance = instanceName;
    if (!targetInstance && tenantId) {
      const { data: waConn } = await supabase
        .from('channel_connections')
        .select('config')
        .eq('tenant_id', tenantId)
        .eq('channel', 'whatsapp')
        .maybeSingle();
      targetInstance = waConn?.config?.instance_name;
    }
    if (!targetInstance) targetInstance = 'qwalify-main';

    const cleanPhone = repPhone.replace(/\D/g, '');
    const testText = `🔥 *[TEST NOTIFICATION] Qwalify Human Handoff*\n*Status:* ✅ Connected!\n\nWhen a hot prospect (score ≥ 75) is qualified or manually claimed, you will receive real-time alerts right here.`;

    const evoRes = await fetch(`${EVOLUTION_URL}/message/sendText/${targetInstance}`, {
      method: 'POST',
      headers: {
        apikey: EVOLUTION_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        number: cleanPhone,
        text: testText,
      }),
    });

    if (evoRes.ok) {
      res.json({ success: true, ok: true, message: 'WhatsApp test alert sent' });
    } else {
      const errText = await evoRes.text();
      res.status(400).json({ error: `WhatsApp gateway returned error (${evoRes.status}): ${errText}` });
    }
  } catch (err) {
    console.error('[WhatsApp Test Alert Error]:', err);
    res.status(500).json({ error: err.message || 'Error sending WhatsApp alert' });
  }
});

// ─── Telegram Rep Inbound Webhook (Captures Rep Replies on Telegram & Relays to WhatsApp) ───
app.post('/webhook/telegram-rep', async (req, res) => {
  try {
    const update = req.body;
    const msg = update?.message;
    if (!msg || !msg.text) return res.json({ status: 'ignored_no_text' });

    const chatId = String(msg.chat?.id);
    const text = msg.text.trim();
    const repName = msg.from?.first_name || 'Rep';

    console.log(`[Telegram Rep Inbound] From Chat ID ${chatId} (${repName}): "${text}"`);

    // 1. Find Tenant with this Rep Chat ID
    let { data: repSetting } = await supabase
      .from('rep_settings')
      .select('tenant_id, bot_token')
      .eq('notification_handle', chatId)
      .eq('is_active', true)
      .maybeSingle();

    let tenantId = repSetting?.tenant_id;
    let botToken = repSetting?.bot_token || process.env.TELEGRAM_BOT_TOKEN;

    if (!tenantId) {
      // Check channel_connections
      const { data: conn } = await supabase
        .from('channel_connections')
        .select('tenant_id, config')
        .eq('channel', 'telegram_rep_handoff')
        .filter('config->>chat_id', 'eq', chatId)
        .maybeSingle();

      if (conn?.tenant_id) {
        tenantId = conn.tenant_id;
        botToken = conn.config?.bot_token || botToken;
      }
    }

    if (!tenantId) {
      // Check first tenant
      const { data: firstTenant } = await supabase.from('tenants').select('id, settings').limit(1).maybeSingle();
      tenantId = firstTenant?.id;
    }

    // 2. Check for /resolve command
    if (text.startsWith('/resolve') || text.startsWith('/resolved')) {
      // Find latest pending handoff event for this tenant
      const { data: openHandoff } = await supabase
        .from('handoff_events')
        .select('id, lead_id')
        .eq('tenant_id', tenantId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (openHandoff?.lead_id) {
        await supabase.from('leads').update({ bot_paused: false, is_handoff_ready: false }).eq('id', openHandoff.lead_id);
        await supabase.from('conversations').update({ state: 'active' }).eq('lead_id', openHandoff.lead_id);
        await supabase.from('handoff_events').update({ status: 'resolved', resolved_at: new Date().toISOString() }).eq('id', openHandoff.id);

        await sendTelegramAlert({
          token: botToken,
          chatId,
          text: `✅ <b>Handoff Resolved!</b> AI bot auto-replies have been resumed for this lead.`,
        });
        return res.json({ status: 'resolved' });
      } else {
        await sendTelegramAlert({
          token: botToken,
          chatId,
          text: `ℹ️ No active pending handoff found to resolve.`,
        });
        return res.json({ status: 'no_active_handoff' });
      }
    }

    // 3. Regular message -> Relay to latest active lead on WhatsApp
    const { data: activeHandoff } = await supabase
      .from('handoff_events')
      .select('id, lead_id')
      .eq('tenant_id', tenantId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!activeHandoff?.lead_id) {
      await sendTelegramAlert({
        token: botToken,
        chatId,
        text: `ℹ️ You replied, but there is no active hot lead conversation awaiting takeover right now.`,
      });
      return res.json({ status: 'no_lead_target' });
    }

    const { data: lead } = await supabase.from('leads').select('*').eq('id', activeHandoff.lead_id).maybeSingle();
    if (!lead) return res.json({ status: 'lead_not_found' });

    // Send to WhatsApp via Evolution API
    if (lead.source_channel === 'whatsapp' && lead.contact) {
      const { data: conn } = await supabase
        .from('channel_connections')
        .select('config')
        .eq('tenant_id', tenantId)
        .eq('channel', 'whatsapp')
        .maybeSingle();

      const instanceName = conn?.config?.instance_name || 'qwalify-main';
      const cleanPhone = lead.contact.replace(/\D/g, '');

      await fetch(`${EVOLUTION_URL}/message/sendText/${instanceName}`, {
        method: 'POST',
        headers: {
          apikey: EVOLUTION_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          number: cleanPhone,
          text: text,
        }),
      }).catch((e) => console.warn('Evolution relay error:', e.message));

      // Save message as sender: 'human'
      const { data: conv } = await supabase.from('conversations').select('id').eq('lead_id', lead.id).maybeSingle();
      if (conv?.id) {
        await supabase.from('messages').insert({
          tenant_id: tenantId,
          conversation_id: conv.id,
          lead_id: lead.id,
          sender: 'human',
          content: text,
          channel: 'whatsapp',
        });
      }

      await sendTelegramAlert({
        token: botToken,
        chatId,
        text: `📨 <b>Relayed to ${lead.full_name} on WhatsApp!</b>`,
      });
    }

    res.json({ status: 'relayed', leadId: lead.id });
  } catch (err) {
    console.error('[Telegram Rep Webhook Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Manual Reply Endpoint (Human Takeover) ───────────────────────────────────
app.post('/api/leads/reply', async (req, res) => {
  try {
    const { leadId, tenantId, message, repName } = req.body;
    if (!leadId || !message?.trim()) {
      return res.status(400).json({ error: 'leadId and message are required' });
    }

    console.log(`[Manual Reply] For lead ${leadId} by ${repName || 'Rep'}: "${message}"`);

    // 1. Fetch Lead
    const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).maybeSingle();
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const targetTenantId = tenantId || lead.tenant_id;

    // 2. Pause AI bot for this lead
    await supabase.from('leads').update({
      bot_paused: true,
      is_handoff_ready: true,
      last_contact_at: new Date().toISOString(),
    }).eq('id', lead.id);

    // 3. Find or Create conversation
    let { data: conv } = await supabase.from('conversations').select('id, channel_thread_id').eq('lead_id', leadId).maybeSingle();
    if (!conv) {
      const { data: newConv } = await supabase.from('conversations').insert({
        tenant_id: targetTenantId,
        lead_id: lead.id,
        channel: lead.source_channel || 'whatsapp',
        state: 'paused',
      }).select().single();
      conv = newConv;
    } else {
      await supabase.from('conversations').update({ state: 'paused' }).eq('id', conv.id);
    }

    // 4. Save message with sender = 'human'
    await supabase.from('messages').insert({
      tenant_id: targetTenantId,
      conversation_id: conv.id,
      lead_id: lead.id,
      sender: 'human',
      content: message,
      channel: lead.source_channel || 'whatsapp',
    });

    // 5. Send message to WhatsApp via Evolution API
    if (lead.source_channel === 'whatsapp' && lead.contact) {
      const { data: conn } = await supabase
        .from('channel_connections')
        .select('config')
        .eq('tenant_id', targetTenantId)
        .eq('channel', 'whatsapp')
        .maybeSingle();

      const instanceName = conn?.config?.instance_name || 'qwalify-main';
      const cleanPhone = lead.contact.replace(/\D/g, '');

      try {
        const evoRes = await fetch(`${EVOLUTION_URL}/message/sendText/${instanceName}`, {
          method: 'POST',
          headers: {
            apikey: EVOLUTION_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            number: cleanPhone,
            text: message,
          }),
        });
        console.log(`[Manual Reply Dispatched to WhatsApp] Status: ${evoRes.status}`);
      } catch (evoErr) {
        console.warn('[Manual Reply Evolution Error]:', evoErr.message);
      }
    }

    res.json({ success: true, status: 'sent', bot_paused: true });
  } catch (err) {
    console.error('[Manual Reply Error]:', err);
    res.status(500).json({ error: err.message || 'Failed to send manual reply' });
  }
});

// ─── Instant Website Brain Scanner ───────────────────────────────────────────
app.post('/api/scrape-knowledge', async (req, res) => {
  try {
    const { url, tenantId } = req.body;
    if (!url || !url.startsWith('http')) {
      return res.status(400).json({ error: 'Valid URL starting with http:// or https:// is required' });
    }

    console.log(`[Brain Scanner] Scraping URL: ${url}`);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return res.status(400).json({ error: `Failed to fetch website (${response.status} ${response.statusText})` });
    }

    const html = await response.text();

    const cleanedText = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
      .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
      .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z0-9#]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 10000);

    let aiConfig = null;
    if (tenantId) {
      const { data: configs } = await supabase.from('ai_provider_configs').select('*').eq('tenant_id', tenantId);
      aiConfig = (configs || []).find((c) => c.is_active) || (configs || [])[0];
    }

    const prompt = `You are an expert AI business intelligence scanner. Analyze this website content and extract structured FAQs and qualification rules.

Extract:
1. business_name: string
2. industry: one of "dental", "real_estate", "school", "salon", "b2b", "auto", "custom"
3. tone: one of "empathetic", "professional", "friendly", "casual", "direct"
4. knowledge_base: array of 4-8 items with format { "category": "...", "question": "...", "answer": "..." } covering pricing, location, hours, services, and policies.
5. qualification_rules: array of 3-5 qualification questions with format { "id": "q1", "text": "...", "weight": 25, "example_answer": "..." }

Return ONLY valid JSON matching that structure.

RAW WEBSITE TEXT:
${cleanedText}`;

    let jsonResult = null;
    const provider = aiConfig?.provider || 'gemini';
    const apiKey = aiConfig?.api_key || '';
    const model = aiConfig?.model || 'gemini-1.5-flash';

    if (provider === 'gemini' && apiKey) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.2, maxOutputTokens: 2048 },
        }),
      });
      if (r.ok) {
        const d = await r.json();
        const text = d.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        jsonResult = JSON.parse(text);
      }
    } else if (apiKey) {
      let baseUrl = 'https://api.openai.com/v1/chat/completions';
      if (provider === 'groq') baseUrl = 'https://api.groq.com/openai/v1/chat/completions';
      if (provider === 'openrouter') baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
      const r = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: model || (provider === 'groq' ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini'),
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.2,
        }),
      });
      if (r.ok) {
        const d = await r.json();
        jsonResult = JSON.parse(d.choices?.[0]?.message?.content || '{}');
      }
    }

    if (!jsonResult || !jsonResult.knowledge_base) {
      const parsedUrl = new URL(url);
      const domainName = parsedUrl.hostname.replace('www.', '').split('.')[0];
      jsonResult = {
        business_name: domainName.charAt(0).toUpperCase() + domainName.slice(1),
        industry: 'custom',
        tone: 'friendly',
        knowledge_base: [
          { category: 'Website', question: 'What is your official website?', answer: url },
          { category: 'Services', question: 'What services do you offer?', answer: 'Please visit our website or ask our team for our full catalog of services and custom packages.' },
          { category: 'Appointments', question: 'How can I book an appointment?', answer: 'You can book directly through our online scheduler or by letting us know your preferred date and time.' },
        ],
        qualification_rules: [
          { id: 'q1', text: 'What service are you most interested in?', weight: 30, example_answer: 'Full consultation' },
          { id: 'q2', text: 'When are you looking to get started?', weight: 25, example_answer: 'Within the next 7 days' },
        ],
      };
    }

    res.json({ success: true, data: jsonResult });
  } catch (err) {
    console.error('[Brain Scanner Error]:', err);
    res.status(500).json({ error: err.message || 'Failed to scan website' });
  }
});

// ─── AI Assistant Rule Generator from Plain Business Description ─────────────
app.post('/api/generate-assistant-rules', async (req, res) => {
  try {
    const { businessDescription, businessName, industry, tenantId } = req.body;
    if (!businessDescription?.trim()) {
      return res.status(400).json({ error: 'Business description is required' });
    }

    console.log(`[Assistant Rule Gen] Generating rules for "${businessName || 'Business'}"`);

    let aiConfig = null;
    if (tenantId) {
      const { data: configs } = await supabase.from('ai_provider_configs').select('*').eq('tenant_id', tenantId);
      aiConfig = (configs || []).find((c) => c.is_active) || (configs || [])[0];
    }

    const prompt = `You are an expert sales qualification architect. A non-technical business owner just described their business and ideal customer in their own words.

BUSINESS NAME: "${businessName || 'Our Business'}"
INDUSTRY: "${industry || 'general'}"
BUSINESS & IDEAL CUSTOMER DESCRIPTION:
"${businessDescription}"

Based on this description, automatically create:
1. "greeting": A warm, natural 1-sentence opening message for WhatsApp / live chat.
2. "qualification_rules": Array of 3-5 high-impact qualification questions (each with "id", "text", "weight" between 15-35, and "example_answer") that systematically verify if an inbound lead matches their ideal customer.
3. "knowledge_base": Array of 4-6 essential FAQ cards ("category", "question", "answer") derived from the description (e.g. Services, Pricing/Budget, Booking, Location/Hours, Process).
4. "suggested_tone": "friendly" | "professional" | "casual" | "empathetic" | "direct"

Return ONLY valid JSON matching this exact structure:
{
  "greeting": "...",
  "suggested_tone": "...",
  "qualification_rules": [
    { "id": "q1", "text": "...", "weight": 25, "example_answer": "..." }
  ],
  "knowledge_base": [
    { "category": "Services", "question": "...", "answer": "..." }
  ]
}`;

    let jsonResult = null;
    const provider = aiConfig?.provider || 'gemini';
    const apiKey = aiConfig?.api_key || '';
    const model = aiConfig?.model || 'gemini-1.5-flash';

    if (provider === 'gemini' && apiKey) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.3, maxOutputTokens: 2048 },
        }),
      });
      if (r.ok) {
        const d = await r.json();
        const text = d.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        jsonResult = JSON.parse(text);
      }
    } else if (apiKey) {
      let baseUrl = 'https://api.openai.com/v1/chat/completions';
      if (provider === 'groq') baseUrl = 'https://api.groq.com/openai/v1/chat/completions';
      if (provider === 'openrouter') baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
      const r = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: model || (provider === 'groq' ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini'),
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.3,
        }),
      });
      if (r.ok) {
        const d = await r.json();
        jsonResult = JSON.parse(d.choices?.[0]?.message?.content || '{}');
      }
    }

    if (!jsonResult || !jsonResult.qualification_rules) {
      jsonResult = {
        greeting: `Hi there! 👋 Thanks for reaching out to ${businessName || 'us'}. How can we help you today?`,
        suggested_tone: 'friendly',
        qualification_rules: [
          { id: 'q1', text: 'What specific service or help are you looking for?', weight: 30, example_answer: 'Consultation & Pricing' },
          { id: 'q2', text: 'When are you hoping to get started?', weight: 25, example_answer: 'Within 7-14 days' },
          { id: 'q3', text: 'What is your estimated budget or scale?', weight: 20, example_answer: 'Standard package' },
        ],
        knowledge_base: [
          { category: 'Overview', question: `What does ${businessName || 'your business'} specialize in?`, answer: businessDescription.slice(0, 200) },
          { category: 'Appointments', question: 'How do I book an appointment?', answer: 'We offer flexible online booking slots or can assist you directly here.' },
        ],
      };
    }

    res.json({ success: true, data: jsonResult });
  } catch (err) {
    console.error('[Assistant Rule Gen Error]:', err);
    res.status(500).json({ error: err.message || 'Failed to generate assistant rules' });
  }
});

// ─── Dynamic Knowledge Base Relevance Retrieval ──────────────────────────────
function retrieveRelevantKnowledge(knowledgeBase, query, conversationHistory = [], maxChunks = 4) {
  if (!Array.isArray(knowledgeBase) || knowledgeBase.length === 0) return [];
  
  const historyText = conversationHistory
    .filter((m) => m.role === 'user' || m.sender === 'lead' || m.sender === 'user')
    .slice(-3)
    .map((m) => m.content || m.text || '')
    .join(' ');
  
  const fullContext = `${query || ''} ${historyText}`.toLowerCase();
  const stopWords = new Set([
    'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'in', 'to', 'for', 'of',
    'with', 'about', 'can', 'you', 'how', 'what', 'do', 'i', 'my', 'we', 'are', 'your', 'me', 'please'
  ]);
  const queryTokens = fullContext
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !stopWords.has(t));

  const scored = knowledgeBase.map((item) => {
    const qText = (item.question || '').toLowerCase();
    const aText = (item.answer || '').toLowerCase();
    const catText = (item.category || '').toLowerCase();

    let score = 0;
    for (const token of queryTokens) {
      if (qText.includes(token)) score += 4;
      else if (catText.includes(token)) score += 2;
      else if (aText.includes(token)) score += 1;
    }

    if (/price|pricing|cost|fee|rate|package|hours|location|address|book|appointment|service/i.test(catText) && score > 0) {
      score += 1;
    }

    return { item, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const positive = scored.filter((s) => s.score > 0).map((s) => s.item);
  if (positive.length > 0) {
    return positive.slice(0, maxChunks);
  }
  return knowledgeBase.slice(0, 2);
}

// ─── Core AI Qualification Engine ─────────────────────────────────────────────
async function generateAIResponse({ provider, apiKey, model, context, conversationHistory, latestMessage, bookingSettings, agent }) {
  const hotThreshold = agent?.hot_threshold || bookingSettings?.hot_score_threshold || 75;
  const bookingUrl = agent?.booking_url || bookingSettings?.booking_url || null;

  const toneDesc = {
    empathetic: 'Warm, compassionate, reassuring, and attentive. Show genuine care in every reply.',
    professional: 'Polite, clear, business-focused, authoritative, and concise. Deliver confidence.',
    friendly: 'Warm, welcoming, energetic, helpful, and conversational like a trusted advisor.',
    casual: 'Modern, vibrant, relaxed, conversational, and direct.',
    direct: 'Fast, clear, efficient, no fluff, straight to the point.',
  }[agent?.tone || 'friendly'] || 'Polite, natural, and helpful.';

  const emojiDesc = {
    none: 'Do NOT use emojis under any circumstances.',
    subtle: 'Use at most 1 tasteful emoji every 1-2 messages (e.g. 👋, 📅, ✨).',
    expressive: 'Use friendly, expressive emojis naturally throughout the conversation.',
  }[agent?.emoji_style || 'subtle'] || 'Use 1 subtle emoji when natural.';

  const relevantKB = retrieveRelevantKnowledge(agent?.knowledge_base, latestMessage, conversationHistory, 4);
  let kbSection = '';
  if (relevantKB.length > 0) {
    kbSection = `VERIFIED BUSINESS FACTS & KNOWLEDGE (Use these to answer accurately. NEVER invent facts outside of this):\n` +
      relevantKB.map((k) => `• [${k.category || 'General'}] Q: ${k.question} -> A: ${k.answer}`).join('\n') + '\n\n';
  }

  let qrSection = `KEY QUALIFICATION TARGETS (Discover naturally across the conversation, one by one):\n`;
  if (Array.isArray(agent?.qualification_rules) && agent.qualification_rules.length > 0) {
    qrSection += agent.qualification_rules
      .map((q, i) => `${i + 1}. ${q.text} (Weight: ${q.weight || 20} pts${q.example_answer ? ` - Target: ${q.example_answer}` : ''})`)
      .join('\n') + '\n\n';
  } else {
    qrSection += `1. Specific service or need\n2. Urgency and project timeline\n3. Estimated budget or scope\n\n`;
  }

  const businessDescription = agent?.business_description || `${context.companyName} is in the ${agent?.industry || 'business'} industry.`;
  const rawCustomPrompt = agent?.custom_system_prompt?.trim() || '';

  const systemPrompt = `You are "${agent?.name || 'Qwalify Assistant'}", an expert qualification and sales assistant for "${context.companyName}".
You are communicating directly with a prospect on WhatsApp / Live Chat.

BUSINESS OVERVIEW & IDEAL CLIENT:
${businessDescription}

${rawCustomPrompt ? `TENANT CUSTOM PROMPT OVERRIDE (High Priority):\n${rawCustomPrompt}\n\n` : ''}${kbSection}${qrSection}PROSPECT & SESSION STATUS:
- Prospect Name: ${context.leadName || 'Visitor'}
- Current Qualification Score: ${context.currentScore || 15}/100
- Hot Lead Threshold: ${hotThreshold}/100
- Booking Link: ${bookingUrl || '(Not configured)'}

CORE CONVERSATIONAL & QUALIFICATION RULES:
1. QUALIFICATION GOAL (NOT JUST CHAT): Your primary mission is to systematically discover their intent, timeline, budget, and specific requirements to qualify them for our team.
2. ONE QUESTION AT A TIME: NEVER interrogate the prospect. Ask strictly ONE focused question per reply.
3. ACTIVE LISTENING & ADAPTABILITY: Acknowledge what the prospect already said before moving forward. Never repeat questions they already answered.
4. BUYING-INTENT RECOGNITION & SCORING:
   - Recognize high-intent signals (concrete budget range, immediate timeline "this week", asking "how do I start?", requesting private quote/booking) and increase the qualification score significantly (+15 to +35 pts).
   - When score reaches ${hotThreshold} OR when the prospect asks to book/schedule, provide the booking link smoothly: "${bookingUrl || 'https://calendly.com'}"
5. STRICT HONESTY & NO HALLUCINATIONS:
   - ONLY state facts, prices, and policies explicitly verified in the BUSINESS FACTS section above.
   - If the prospect asks something NOT covered in the knowledge base, do NOT guess. Honestly state: "I want to get you the exact details on that — I'll have one of our team specialists confirm and follow up with you right away! In the meantime, [continue qualification / ask next question]."
6. STYLE & TONE:
   - Selected Tone: ${toneDesc}
   - Emojis: ${emojiDesc}
   - Length: Strictly 1 to 2 conversational, punchy sentences.
   - Format: Plain text only. NEVER use markdown headers, asterisks (**), or bullet lists.
   - NEVER mention you are an AI model.

MANDATORY RESPONSE METADATA:
At the very end of your response, output this exact JSON block:
<qualification_json>
{
  "new_score": <number between 0 and 100 based on all qualification signals gathered>,
  "score_reason": "<1 concise sentence explaining the score progression>",
  "is_handoff_ready": <true if score >= ${hotThreshold} or prospect requested human, else false>,
  "booking_triggered": <true if booking link was provided in this reply, else false>
}
</qualification_json>`;

  const formattedHistory = (conversationHistory || []).map((m) => ({
    role: (m.sender === 'lead' || m.sender === 'user' || m.role === 'user') ? 'user' : 'assistant',
    content: m.content || m.text || '',
  })).filter((m) => m.content?.trim());

  const messages = [
    ...formattedHistory,
    { role: 'user', content: latestMessage },
  ];

  let rawReply = '';

  // 1. Direct Anthropic / Claude Messages API
  if ((provider === 'anthropic' || provider === 'claude') && apiKey) {
    try {
      const claudeMessages = messages.map((m) => ({ role: m.role, content: m.content }));
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: model || 'claude-3-5-sonnet-20241022',
          max_tokens: 400,
          system: systemPrompt,
          messages: claudeMessages,
        }),
      });
      if (r.ok) {
        const d = await r.json();
        rawReply = d.content?.[0]?.text || '';
      } else {
        console.error('Anthropic API error:', await r.text());
      }
    } catch (e) {
      console.error('Anthropic call exception:', e);
    }
  } else if (provider === 'gemini' && apiKey) {
    // 2. Google Gemini API
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-1.5-flash'}:generateContent?key=${apiKey}`;
      const geminiContents = messages.map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }));
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: geminiContents,
          generationConfig: { maxOutputTokens: 350, temperature: 0.3 },
        }),
      });
      if (r.ok) {
        const d = await r.json();
        rawReply = d.candidates?.[0]?.content?.parts?.[0]?.text || '';
      } else {
        console.error('Gemini API error:', await r.text());
      }
    } catch (e) {
      console.error('Gemini call exception:', e);
    }
  } else if (apiKey) {
    // 3. OpenAI / Groq / OpenRouter / Mistral / Grok Chat Completions
    let baseUrl = 'https://api.openai.com/v1/chat/completions';
    if (provider === 'groq') baseUrl = 'https://api.groq.com/openai/v1/chat/completions';
    if (provider === 'openrouter') baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
    if (provider === 'mistral') baseUrl = 'https://api.mistral.ai/v1/chat/completions';
    if (provider === 'grok') baseUrl = 'https://api.x.ai/v1/chat/completions';

    try {
      const r = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: model || (provider === 'groq' ? 'llama-3.3-70b-versatile' : provider === 'openrouter' ? 'anthropic/claude-3.5-sonnet' : 'gpt-4o-mini'),
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages,
          ],
          temperature: 0.3,
          max_tokens: 350,
        }),
      });
      if (r.ok) {
        const d = await r.json();
        rawReply = d.choices?.[0]?.message?.content || '';
      } else {
        console.error(`${provider} API error:`, await r.text());
      }
    } catch (e) {
      console.error(`${provider} call exception:`, e);
    }
  }

  // Fallback if provider error
  if (!rawReply) {
    const isReady = (context.currentScore || 15) >= hotThreshold;
    rawReply = `Thanks for reaching out! How soon are you looking to get started?
<qualification_json>
{"new_score": ${Math.min(100, (context.currentScore || 15) + 15)}, "score_reason": "Inquiry acknowledged, gathering timeline", "is_handoff_ready": ${isReady}, "booking_triggered": false}
</qualification_json>`;
  }

  const jsonRegex = /<qualification_json>([\s\S]*?)<\/qualification_json>/i;
  const match = rawReply.match(jsonRegex);
  let score = context.currentScore || 15;
  let scoreReason = 'Qualification updated';
  let isHandoffReady = false;
  let bookingTriggered = false;

  if (match?.[1]) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (typeof parsed.new_score === 'number') score = Math.min(100, Math.max(0, Math.round(parsed.new_score)));
      if (parsed.score_reason) scoreReason = parsed.score_reason;
      if (typeof parsed.is_handoff_ready === 'boolean') isHandoffReady = parsed.is_handoff_ready;
      if (typeof parsed.booking_triggered === 'boolean') bookingTriggered = parsed.booking_triggered;
    } catch (e) {
      console.warn('Failed to parse qualification JSON:', e);
    }
  }

  let replyText = rawReply
    .replace(jsonRegex, '')
    .replace(/[*_~`#>]+/g, '')
    .trim();

  const sentences = replyText.match(/[^.!?]+[.!?](?:\s|$)|[^.!?]+$/g) || [];
  if (sentences.length > 2) {
    replyText = sentences.slice(0, 2).join(' ').trim();
  }

  return { replyText, score, scoreReason, isHandoffReady, bookingTriggered };
}

// ─── Public Embeddable Web Chat & Simulator Endpoint ─────────────────────────
app.post('/api/widget/chat', async (req, res) => {
  try {
    const { agentId, tenantId, message, conversationId, leadName, leadContact, conversationHistory } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'Message required' });

    let targetTenantId = tenantId;
    let targetAgent = null;

    if (agentId && agentId !== 'default') {
      const { data: agentRow } = await supabase.from('ai_agents').select('*').eq('id', agentId).maybeSingle();
      if (agentRow) {
        targetAgent = agentRow;
        targetTenantId = targetTenantId || agentRow.tenant_id;
      }
    }

    if (!targetTenantId) {
      const { data: firstTenant } = await supabase.from('tenants').select('id, name, settings').limit(1).maybeSingle();
      targetTenantId = firstTenant?.id;
      if (!targetAgent) {
        targetAgent = firstTenant?.settings?.active_agent || (firstTenant?.settings?.agents || []).find((a) => a.is_active);
      }
    }

    const [{ data: aiConfigs }, { data: bookingSettings }, { data: tenantData }] = await Promise.all([
      supabase.from('ai_provider_configs').select('*').eq('tenant_id', targetTenantId),
      supabase.from('booking_settings').select('*').eq('tenant_id', targetTenantId).maybeSingle(),
      supabase.from('tenants').select('id, name, settings').eq('id', targetTenantId).maybeSingle(),
    ]);

    const activeAI = (aiConfigs || []).find((c) => c.is_active) || (aiConfigs || [])[0];
    const companyName = tenantData?.name || 'Our Company';
    if (!targetAgent) {
      targetAgent = tenantData?.settings?.active_agent || (tenantData?.settings?.agents || []).find((a) => a.is_active);
    }

    const contact = leadContact || `web_${(conversationId || 'guest').slice(0, 18)}`;
    let { data: lead } = await supabase.from('leads').select('*').eq('tenant_id', targetTenantId).eq('contact', contact).maybeSingle();
    if (!lead) {
      const { data: newLead } = await supabase.from('leads').insert({
        tenant_id: targetTenantId,
        full_name: leadName || 'Website Visitor',
        contact,
        source_channel: 'website',
        status: 'qualifying',
        score: 15,
        last_contact_at: new Date().toISOString(),
      }).select().single();
      lead = newLead;
    }

    // Check if bot is paused for this lead
    if (lead?.bot_paused) {
      return res.json({
        reply: "Our team has taken over this conversation and will respond shortly!",
        score: lead.score,
        status: lead.status,
        bot_paused: true,
      });
    }

    // Conversation history preparation
    let fullHistory = conversationHistory || [];
    if (!fullHistory || fullHistory.length === 0) {
      // Fetch from DB messages if exists
      const { data: dbMessages } = await supabase
        .from('messages')
        .select('sender, content')
        .eq('lead_id', lead?.id)
        .order('created_at', { ascending: true })
        .limit(15);

      if (dbMessages && dbMessages.length > 0) {
        fullHistory = dbMessages;
      }
    }

    const { replyText, score, scoreReason, isHandoffReady, bookingTriggered } = await generateAIResponse({
      provider: activeAI?.provider || 'gemini',
      apiKey: activeAI?.api_key || '',
      model: activeAI?.model || 'gemini-1.5-flash',
      context: {
        companyName,
        leadName: leadName || lead?.full_name || 'Visitor',
        currentScore: lead?.score || 15,
      },
      conversationHistory: fullHistory,
      latestMessage: message,
      bookingSettings,
      agent: targetAgent,
    });

    const newStatus = score >= (targetAgent?.hot_threshold || 75) ? 'hot' : score >= 45 ? 'warm' : 'qualifying';

    if (lead?.id) {
      // 1. Update Lead score
      await supabase.from('leads').update({
        score,
        status: newStatus,
        is_handoff_ready: isHandoffReady || newStatus === 'hot',
        last_contact_at: new Date().toISOString(),
      }).eq('id', lead.id);

      // 2. Insert into qualification_scores table for Lead Detail history tracking
      await supabase.from('qualification_scores').insert({
        tenant_id: targetTenantId,
        lead_id: lead.id,
        score,
        score_breakdown: {
          reason: scoreReason,
          booking_triggered: bookingTriggered,
          is_handoff_ready: isHandoffReady,
        },
      }).catch((e) => console.warn('Qualification score insert notice:', e.message));

      // 3. Find or create conversation and save messages
      let { data: conv } = await supabase.from('conversations').select('id').eq('lead_id', lead.id).maybeSingle();
      if (!conv) {
        const { data: newConv } = await supabase.from('conversations').insert({
          tenant_id: targetTenantId,
          lead_id: lead.id,
          channel: 'website',
          channel_thread_id: conversationId || contact,
        }).select().single();
        conv = newConv;
      }

      if (conv?.id) {
        await supabase.from('messages').insert([
          { tenant_id: targetTenantId, conversation_id: conv.id, lead_id: lead.id, sender: 'lead', content: message, channel: 'website' },
          { tenant_id: targetTenantId, conversation_id: conv.id, lead_id: lead.id, sender: 'ai', content: replyText, channel: 'website' },
        ]).catch(() => null);
      }

      // 4. Trigger Handoff if qualified
      if (newStatus === 'hot' || isHandoffReady) {
        await triggerHumanHandoff({
          tenantId: targetTenantId,
          lead: { ...lead, score, status: newStatus },
          reason: 'auto_hot_score',
        });
      }
    }

    res.json({
      reply: replyText,
      score,
      scoreReason,
      status: newStatus,
      isHandoffReady,
      bookingTriggered,
      bookingUrl: targetAgent?.booking_url || bookingSettings?.booking_url,
    });
  } catch (err) {
    console.error('[Widget Chat Error]:', err);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
});

// ─── WhatsApp Webhook Handler (With Auto-Pause & Handoff Integration) ──────────
app.post('/webhook/whatsapp', async (req, res) => {
  try {
    const body = req.body;
    console.log('[WhatsApp Webhook] Event:', body.event, 'Instance:', body.instance);

    const event = body.event;
    const data = body.data;

    if (event === 'messages.upsert' && data?.key && !data.key.fromMe) {
      const senderPhone = data.key.remoteJid?.replace('@s.whatsapp.net', '') || '';
      const pushName = data.pushName || 'WhatsApp Prospect';
      const messageText = data.message?.conversation || data.message?.extendedTextMessage?.text || '';
      const instanceName = body.instance || 'qwalify-main';

      if (!messageText || !senderPhone) {
        return res.json({ status: 'ignored_empty_message' });
      }

      console.log(`[WhatsApp Inbound] From ${pushName} (${senderPhone}): "${messageText}"`);

      // 1. Find Tenant by instance name or slug
      let tenantId = null;
      let tenantName = 'Qwalify Workspace';

      const { data: conn } = await supabase
        .from('channel_connections')
        .select('tenant_id')
        .eq('channel', 'whatsapp')
        .filter('config->>instance_name', 'eq', instanceName)
        .maybeSingle();

      if (conn?.tenant_id) {
        tenantId = conn.tenant_id;
      } else {
        const slug = instanceName.replace('tenant-', '');
        const { data: tenant } = await supabase
          .from('tenants')
          .select('id, name')
          .eq('slug', slug)
          .maybeSingle();

        if (tenant?.id) {
          tenantId = tenant.id;
          tenantName = tenant.name;
        } else {
          const { data: firstTenant } = await supabase.from('tenants').select('id, name').limit(1).maybeSingle();
          if (firstTenant) {
            tenantId = firstTenant.id;
            tenantName = firstTenant.name;
          }
        }
      }

      if (!tenantId) {
        console.warn('No tenant found in Supabase for incoming message.');
        return res.json({ status: 'no_tenant' });
      }

      // 2. Upsert Lead
      let { data: lead } = await supabase
        .from('leads')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('contact', senderPhone)
        .maybeSingle();

      if (!lead) {
        const { data: newLead } = await supabase
          .from('leads')
          .insert({
            tenant_id: tenantId,
            full_name: pushName,
            contact: senderPhone,
            source_channel: 'whatsapp',
            status: 'qualifying',
            score: 15,
            last_contact_at: new Date().toISOString(),
          })
          .select()
          .single();
        lead = newLead;
      } else {
        await supabase
          .from('leads')
          .update({ last_contact_at: new Date().toISOString() })
          .eq('id', lead.id);
      }

      // 3. Upsert Conversation & Save Inbound Message
      let { data: conv } = await supabase
        .from('conversations')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('lead_id', lead.id)
        .eq('channel', 'whatsapp')
        .maybeSingle();

      if (!conv) {
        const { data: newConv } = await supabase
          .from('conversations')
          .insert({
            tenant_id: tenantId,
            lead_id: lead.id,
            channel: 'whatsapp',
            channel_thread_id: data.key.remoteJid,
          })
          .select()
          .single();
        conv = newConv;
      }

      // Insert incoming message
      await supabase.from('messages').insert({
        tenant_id: tenantId,
        conversation_id: conv.id,
        lead_id: lead.id,
        sender: 'lead',
        content: messageText,
        channel: 'whatsapp',
      });

      // ─── AUTO-PAUSE CHECK: If bot is paused (human handling), SKIP AI entirely ───
      const isBotPaused = lead.bot_paused || lead.is_handoff_ready || conv.state === 'paused';
      if (isBotPaused) {
        console.log(`[WhatsApp Inbound] Lead ${lead.full_name} (${lead.id}) is in HUMAN HANDOFF (bot_paused=true). Skipping AI reply.`);

        // Forward message to Rep on Telegram
        const repSettings = await getTenantRepSettings(tenantId);
        if (repSettings?.handle && repSettings?.botToken) {
          const forwardText = `💬 <b>[${pushName} on WhatsApp]:</b>\n"${messageText}"\n\n<i>Reply to this message on Telegram to text back, or open dashboard.</i>`;
          await sendTelegramAlert({
            token: repSettings.botToken,
            chatId: repSettings.handle,
            text: forwardText,
          });
        }

        return res.json({ status: 'bot_paused', replied: false, forwarded_to_rep: true });
      }

      // 4. Load Active AI Provider Config + Booking Settings + Active AI Worker
      const [{ data: aiConfigs }, { data: bookingSettings }, { data: activeAgentRow }, { data: tenantData }] = await Promise.all([
        supabase.from('ai_provider_configs').select('*').eq('tenant_id', tenantId),
        supabase.from('booking_settings').select('*').eq('tenant_id', tenantId).maybeSingle(),
        supabase.from('ai_agents').select('*').eq('tenant_id', tenantId).eq('is_active', true).limit(1).maybeSingle(),
        supabase.from('tenants').select('id, name, settings').eq('id', tenantId).maybeSingle(),
      ]);

      const activeAgent = activeAgentRow || tenantData?.settings?.active_agent || (tenantData?.settings?.agents || []).find((a) => a.is_active) || null;
      const activeAI = (aiConfigs || []).find((c) => c.is_active) || (aiConfigs || [])[0];

      // Fetch last 20 messages for complete conversational context
      const { data: pastMessages } = await supabase
        .from('messages')
        .select('sender, content')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: true })
        .limit(20);

      // 5. Execute AI Turn
      const { replyText, score, scoreReason, isHandoffReady, bookingTriggered } = await generateAIResponse({
        provider: activeAI?.provider || 'gemini',
        apiKey: activeAI?.api_key || '',
        model: activeAI?.model || 'gemini-1.5-flash',
        context: {
          companyName: tenantName,
          leadName: pushName,
          currentScore: lead?.score || 15,
        },
        conversationHistory: pastMessages || [],
        latestMessage: messageText,
        bookingSettings: bookingSettings || null,
        agent: activeAgent || null,
      });

      // Update lead score & status
      const hotThreshold = activeAgent?.hot_threshold || 75;
      const isHot = score >= hotThreshold;
      const newStatus = isHot ? 'hot' : score >= 45 ? 'warm' : 'qualifying';

      await supabase
        .from('leads')
        .update({
          score,
          status: newStatus,
          is_handoff_ready: isHandoffReady || isHot,
          last_contact_at: new Date().toISOString(),
        })
        .eq('id', lead.id);

      // Record in qualification_scores for Lead Detail score tracking
      await supabase.from('qualification_scores').insert({
        tenant_id: tenantId,
        lead_id: lead.id,
        score,
        score_breakdown: {
          reason: scoreReason,
          booking_triggered: bookingTriggered,
          is_handoff_ready: isHandoffReady,
          channel: 'whatsapp',
        },
      }).catch(() => null);

      // Insert AI reply message
      await supabase.from('messages').insert({
        tenant_id: tenantId,
        conversation_id: conv.id,
        lead_id: lead.id,
        sender: 'ai',
        content: replyText,
        channel: 'whatsapp',
      });

      // 5b. Booking trigger
      if (bookingTriggered && bookingSettings?.booking_url) {
        const scheduledAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
        await supabase.from('bookings').insert({
          tenant_id: tenantId,
          lead_id: lead.id,
          scheduled_at: scheduledAt,
          duration_mins: bookingSettings.meeting_duration_mins || 30,
          meeting_url: bookingSettings.booking_url,
          status: 'confirmed',
          source_channel: 'whatsapp',
          notes: `Booking link sent via WhatsApp AI: ${bookingSettings.booking_url}`,
        }).catch(() => null);
      }

      // 5c. HOT LEAD AUTO-HANDOFF TRIGGER
      if (isHot || isHandoffReady) {
        await triggerHumanHandoff({
          tenantId,
          lead: { ...lead, score, status: newStatus },
          reason: 'auto_hot_score',
          conversationId: conv.id,
        });
      }

      // 6. Send Reply to WhatsApp via Evolution API
      const sendApiKey = body.apikey || data?.apikey || EVOLUTION_API_KEY;
      console.log(`[WhatsApp Outbound] To ${senderPhone} (score=${score}, status=${newStatus}): "${replyText}"`);

      try {
        await fetch(`${EVOLUTION_URL}/message/sendText/${instanceName}`, {
          method: 'POST',
          headers: {
            apikey: sendApiKey,
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0',
          },
          body: JSON.stringify({
            number: senderPhone,
            text: replyText,
          }),
        });
      } catch (err) {
        console.error('[WhatsApp Outbound Error]:', err);
      }

      return res.json({ status: 'success', replied: true, score, isHot });
    }

    res.json({ status: 'ignored_event' });
  } catch (error) {
    console.error('[WhatsApp Webhook Error]:', error);
    res.status(500).json({ error: String(error) });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Qwalify Webhook Engine running on port ${PORT}`);
});
