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

// ─── Get Tenant Rep Settings (Telegram) ───────────────────────────────────────
async function getTenantRepSettings(tenantId) {
  try {
    // 1. Check rep_settings table if exists
    const { data: repRow } = await supabase
      .from('rep_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .maybeSingle();

    if (repRow?.notification_handle) {
      return {
        channel: repRow.notification_channel || 'telegram',
        handle: repRow.notification_handle,
        botToken: repRow.bot_token || process.env.TELEGRAM_BOT_TOKEN,
      };
    }

    // 2. Check channel_connections for Telegram
    const { data: tgConn } = await supabase
      .from('channel_connections')
      .select('config')
      .eq('tenant_id', tenantId)
      .eq('channel', 'telegram')
      .maybeSingle();

    // 3. Check tenant settings
    const { data: tenant } = await supabase
      .from('tenants')
      .select('settings')
      .eq('id', tenantId)
      .maybeSingle();

    const handle = tenant?.settings?.rep_telegram_chat_id || process.env.REP_TELEGRAM_CHAT_ID;
    const botToken = tgConn?.config?.bot_token || tenant?.settings?.telegram_bot_token || process.env.TELEGRAM_BOT_TOKEN;

    return {
      channel: 'telegram',
      handle,
      botToken,
    };
  } catch {
    return {
      channel: 'telegram',
      handle: process.env.REP_TELEGRAM_CHAT_ID,
      botToken: process.env.TELEGRAM_BOT_TOKEN,
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

    // 4. Dispatch Telegram alert to rep
    const repSettings = await getTenantRepSettings(tenantId);
    if (repSettings?.handle && repSettings?.botToken) {
      const dashboardLink = `https://qwalify.online/leads/${lead.id}`;
      const alertText = `🔥 <b>Hot Lead Alert: ${lead.full_name}</b> (${lead.source_channel || 'WhatsApp'})
<b>Score:</b> ${lead.score || 75}/100
<b>Summary:</b> ${summary}

👉 <b>Reply to this message</b> to text the lead directly, or <a href="${dashboardLink}">open dashboard</a>.
To resume AI bot, send <code>/resolve</code>`;

      await sendTelegramAlert({
        token: repSettings.botToken,
        chatId: repSettings.handle,
        text: alertText,
      });
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

// ─── Public Embeddable Web Chat Widget Endpoint ──────────────────────────────
app.post('/api/widget/chat', async (req, res) => {
  try {
    const { agentId, tenantId, message, conversationId, leadName, leadContact } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'Message required' });

    let targetTenantId = tenantId;
    let targetAgent = null;

    if (agentId) {
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

    const contact = leadContact || `web_${(conversationId || 'guest').slice(0, 12)}`;
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
    if (lead.bot_paused) {
      return res.json({
        reply: "Our team has taken over this conversation and will respond shortly!",
        score: lead.score,
        status: lead.status,
        bot_paused: true,
      });
    }

    const { replyText, score, isHandoffReady, bookingTriggered } = await generateAIResponse({
      provider: activeAI?.provider || 'gemini',
      apiKey: activeAI?.api_key || '',
      model: activeAI?.model || 'gemini-1.5-flash',
      context: {
        companyName,
        leadName: leadName || 'Visitor',
        currentScore: lead?.score || 15,
      },
      conversationHistory: [],
      latestMessage: message,
      bookingSettings,
      agent: targetAgent,
    });

    const newStatus = score >= (targetAgent?.hot_threshold || 75) ? 'hot' : score >= 45 ? 'warm' : 'qualifying';
    if (lead?.id) {
      await supabase.from('leads').update({
        score,
        status: newStatus,
        is_handoff_ready: isHandoffReady || false,
        last_contact_at: new Date().toISOString(),
      }).eq('id', lead.id);

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

// ─── Embeddable Widget Script (widget.js) ────────────────────────────────────
app.get('/widget.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`
(function() {
  var script = document.currentScript || document.querySelector('script[data-agent]');
  var agentId = script ? script.getAttribute('data-agent') : '';
  var host = window.location.origin.includes('localhost') ? 'https://qwalify.online' : window.location.origin;
  var iframeUrl = host + '/embed/' + (agentId || 'default');

  var container = document.createElement('div');
  container.id = 'qwalify-chat-root';
  container.style.position = 'fixed';
  container.style.bottom = '24px';
  container.style.right = '24px';
  container.style.zIndex = '999999';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.alignItems = 'flex-end';
  container.style.fontFamily = 'system-ui, -apple-system, sans-serif';

  var btn = document.createElement('button');
  btn.style.width = '60px';
  btn.style.height = '60px';
  btn.style.borderRadius = '50%';
  btn.style.background = 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)';
  btn.style.boxShadow = '0 10px 25px rgba(124, 58, 237, 0.45)';
  btn.style.border = 'none';
  btn.style.cursor = 'pointer';
  btn.style.display = 'flex';
  btn.style.alignItems = 'center';
  btn.style.justifyContent = 'center';
  btn.style.color = '#ffffff';
  btn.style.fontSize = '26px';
  btn.style.transition = 'all 0.25s ease';
  btn.innerHTML = '⚡';

  var frame = document.createElement('iframe');
  frame.src = iframeUrl;
  frame.style.width = '390px';
  frame.style.height = '600px';
  frame.style.maxHeight = 'calc(100vh - 120px)';
  frame.style.maxWidth = 'calc(100vw - 48px)';
  frame.style.border = 'none';
  frame.style.borderRadius = '24px';
  frame.style.boxShadow = '0 25px 50px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)';
  frame.style.marginBottom = '16px';
  frame.style.display = 'none';
  frame.style.backgroundColor = '#0b0f19';

  var isOpen = false;
  btn.onclick = function() {
    isOpen = !isOpen;
    if (isOpen) {
      frame.style.display = 'block';
      btn.innerHTML = '✕';
      btn.style.transform = 'scale(0.95)';
    } else {
      frame.style.display = 'none';
      btn.innerHTML = '⚡';
      btn.style.transform = 'scale(1)';
    }
  };

  container.appendChild(frame);
  container.appendChild(btn);
  document.body.appendChild(container);
})();
  `);
});

async function generateAIResponse({ provider, apiKey, model, context, conversationHistory, latestMessage, bookingSettings, agent }) {
  const hotThreshold = agent?.hot_threshold || bookingSettings?.hot_score_threshold || 75;
  const bookingUrl = agent?.booking_url || bookingSettings?.booking_url || null;

  const toneDesc = {
    empathetic: 'Warm, caring, reassuring, and patient (ideal for clinics, salons, healthcare).',
    professional: 'Authoritative, polite, clear, and business-focused (ideal for B2B, real estate).',
    friendly: 'Enthusiastic, approachable, and helpful (ideal for schools, retail).',
    casual: 'Modern, vibrant, upbeat, and conversational (ideal for salons, spas).',
    direct: 'Fast, concise, and straight to the point (ideal for auto, urgent inquiries).',
  }[agent?.tone || 'friendly'] || 'Polite and helpful.';

  const emojiDesc = {
    none: 'Do NOT use emojis under any circumstances.',
    subtle: 'Use at most 1-2 subtle emojis per conversation.',
    expressive: 'Use friendly, expressive emojis naturally.',
  }[agent?.emoji_style || 'subtle'] || 'Use subtle emojis.';

  let kbSection = '';
  if (Array.isArray(agent?.knowledge_base) && agent.knowledge_base.length > 0) {
    kbSection = `BUSINESS KNOWLEDGE & FAQS (use these to answer customer questions accurately):\n` +
      agent.knowledge_base.map((k) => `• [${k.category || 'General'}] Q: ${k.question} -> A: ${k.answer}`).join('\n');
  }

  let qrSection = `YOUR DISCOVERY GOALS (ask one question at a time in natural conversational order):\n`;
  if (Array.isArray(agent?.qualification_rules) && agent.qualification_rules.length > 0) {
    qrSection += agent.qualification_rules
      .map((q, i) => `${i + 1}. ${q.text} (Weight: ${q.weight || 20} pts)`)
      .join('\n');
  } else {
    qrSection += `1. What specific service or need do they have?\n2. What is their target timeline?\n3. What is their rough budget range?`;
  }

  let customPromptSection = '';
  if (agent?.custom_system_prompt?.trim()) {
    customPromptSection = `SPECIAL BUSINESS INSTRUCTIONS:\n${agent.custom_system_prompt.trim()}\n`;
  }

  const systemPrompt = `You are "${agent?.name || 'Qwalify AI'}", an elite qualification assistant for "${context.companyName}" (${agent?.industry || 'business'} industry).
You are chatting with a prospect on WhatsApp.

TONE & STYLE:
- Tone: ${toneDesc}
- Emojis: ${emojiDesc}
- Length: STRICTLY 1-2 sentences max. Keep replies punchy, natural, and conversational like a real human texting on WhatsApp.
- Ask only ONE question at a time. Never overwhelm the prospect.

${kbSection ? kbSection + '\n\n' : ''}${qrSection}

${customPromptSection}LEAD INFO: ${context.leadName} | Current score: ${context.currentScore}/100 | Hot threshold: ${hotThreshold}

BOOKING RULES:
- Propose the booking link when the prospect has answered key qualification questions AND score reaches/approaches ${hotThreshold}.
- If the prospect explicitly asks to schedule/book an appointment, OR if score is ≥ ${hotThreshold}, send the booking link: ${bookingUrl || '(no booking link configured)'}
- Booking message format: "Great, let's get that scheduled! Here's the booking link: <link> — pick any slot that works for you 📅"

STRICT RULES:
- NEVER output headers, bullet lists, or markdown — plain text only.
- NEVER say "I am an AI".
- At the very end of your ENTIRE response, append this hidden metadata JSON:
<qualification_json>
{"new_score": <0-100>, "score_reason": "<1 sentence>", "is_handoff_ready": <true/false>, "booking_triggered": <true if you included the booking link, false otherwise>}
</qualification_json>`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...(conversationHistory || []).slice(-8).map((m) => ({
      role: m.sender === 'lead' ? 'user' : 'assistant',
      content: m.content,
    })),
    { role: 'user', content: latestMessage },
  ];

  let rawReply = `Hey ${context.leadName}! 👋 Thanks for reaching out to ${context.companyName}. How can we assist you today?
<qualification_json>
{"new_score": 20, "score_reason": "First contact, no information gathered yet.", "is_handoff_ready": false, "booking_triggered": false}
</qualification_json>`;

  if (provider === 'gemini' && apiKey) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-1.5-flash'}:generateContent?key=${apiKey}`;
      const geminiMessages = messages.filter(m => m.role !== 'system');
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: geminiMessages.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }],
          })),
          generationConfig: { maxOutputTokens: 300, temperature: 0.4 },
        }),
      });
      if (r.ok) {
        const d = await r.json();
        rawReply = d.candidates?.[0]?.content?.parts?.[0]?.text || rawReply;
      } else {
        console.error('Gemini error:', await r.text());
      }
    } catch (e) {
      console.error('Gemini call error:', e);
    }
  } else if (apiKey) {
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
          model: model || (provider === 'groq' ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini'),
          messages,
          temperature: 0.4,
          max_tokens: 300,
        }),
      });
      if (r.ok) {
        const d = await r.json();
        rawReply = d.choices?.[0]?.message?.content || rawReply;
      } else {
        console.error(`${provider} error:`, await r.text());
      }
    } catch (e) {
      console.error(`${provider} call error:`, e);
    }
  }

  const jsonRegex = /<qualification_json>([\s\S]*?)<\/qualification_json>/i;
  const match = rawReply.match(jsonRegex);
  let score = context.currentScore || 20;
  let isHandoffReady = false;
  let bookingTriggered = false;

  if (match?.[1]) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (typeof parsed.new_score === 'number') score = Math.min(100, Math.max(0, Math.round(parsed.new_score)));
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

  return { replyText, score, isHandoffReady, bookingTriggered };
}

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

      // Fetch last 10 messages for context
      const { data: pastMessages } = await supabase
        .from('messages')
        .select('sender, content')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: true })
        .limit(10);

      // 5. Execute AI Turn
      const { replyText, score, isHandoffReady, bookingTriggered } = await generateAIResponse({
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
