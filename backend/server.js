import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const PORT = process.env.PORT || 3001;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://bmiwzknbsuqxxoeaatnt.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtaXd6a25ic3VxeHhvZWFhdG50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0Njk4MTMsImV4cCI6MjEwNTA0NTgxM30.6x3xf37nQGabBN70H2neyIsXMisZVeLwPfOr7s7IYlA';
const EVOLUTION_URL = process.env.EVOLUTION_URL || 'https://api.nexwa.online';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'Zainab$1212Noor@1212';
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


// ─── AI Response Generator ─────────────────────────────────────────────────────
async function generateAIResponse({ provider, apiKey, model, context, conversationHistory, latestMessage, bookingSettings }) {
  const hotThreshold = bookingSettings?.hot_score_threshold || 75;
  const bookingUrl = bookingSettings?.booking_url || null;

  // Concise WhatsApp-native SDR prompt (fixes issue #1: long robotic replies)
  const systemPrompt = `You are Qwalify AI, an elite Sales Development Representative (SDR) for "${context.companyName}".
You are chatting with a prospect on WhatsApp — keep replies SHORT (1-2 sentences max), natural, and conversational like a real human texting.

LEAD: ${context.leadName} | Current score: ${context.currentScore}/100 | Hot threshold: ${hotThreshold}

YOUR GOALS (discover in natural order — one question per reply, never multiple):
1. What business problem are they solving?
2. Team/company size?
3. Timeline and rough budget?

BOOKING RULES:
- Only propose a booking link after you've confirmed budget AND timeline AND score is approaching ${hotThreshold}.
- If the prospect explicitly asks to book/schedule, OR if score is ≥ ${hotThreshold}, send the booking link: ${bookingUrl || '(no booking link configured yet)'}
- Booking message format: "Great, let's get that scheduled! Here's my booking link: <link> — pick any slot that works for you 📅"

STRICT RULES:
- Max 2 sentences per reply. Be punchy and human.
- Ask only ONE question at a time.
- NEVER say "I'm an AI" or use corporate jargon.
- NEVER output headers, bullet lists, or markdown — plain text only.
- At the end of your ENTIRE response, include this hidden metadata (the prospect will NOT see it):
<qualification_json>
{"new_score": <0-100>, "score_reason": "<1 sentence>", "is_handoff_ready": <true/false>, "booking_triggered": <true if you just sent the booking link, false otherwise>}
</qualification_json>`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...(conversationHistory || []).slice(-8).map((m) => ({
      role: m.sender === 'lead' ? 'user' : 'assistant',
      content: m.content,
    })),
    { role: 'user', content: latestMessage },
  ];

  let rawReply = `Hey ${context.leadName}! 👋 Thanks for reaching out to ${context.companyName}. What brings you here today?
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

  // Parse qualification metadata
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

  // Clean reply: strip JSON metadata + any markdown leftovers
  let replyText = rawReply
    .replace(jsonRegex, '')
    .replace(/[*_~`#>]+/g, '')
    .trim();

  // Hard-cap to 2 sentences to keep WhatsApp replies punchy
  const sentences = replyText.match(/[^.!?]+[.!?](?:\s|$)|[^.!?]+$/g) || [];
  if (sentences.length > 2) {
    replyText = sentences.slice(0, 2).join(' ').trim();
  }

  return { replyText, score, isHandoffReady, bookingTriggered };
}


// ─── WhatsApp Webhook Handler ──────────────────────────────────────────────────
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

      // Check channel_connections
      const { data: conn } = await supabase
        .from('channel_connections')
        .select('tenant_id')
        .eq('channel', 'whatsapp')
        .filter('config->>instance_name', 'eq', instanceName)
        .maybeSingle();

      if (conn?.tenant_id) {
        tenantId = conn.tenant_id;
      } else {
        // Match by slug if instance is tenant-<slug>
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
          // Default to first tenant
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
        .select('id, full_name, status, score')
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
        .select('id')
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

      // 4. Load Active AI Provider Config + Booking Settings (parallel)
      const [{ data: aiConfigs }, { data: bookingSettings }] = await Promise.all([
        supabase.from('ai_provider_configs').select('*').eq('tenant_id', tenantId),
        supabase.from('booking_settings').select('*').eq('tenant_id', tenantId).maybeSingle(),
      ]);

      const activeAI = (aiConfigs || []).find((c) => c.is_active) || (aiConfigs || [])[0];

      // Fetch last 10 messages for conversational context
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
      });

      // Update lead score & status
      const newStatus = score >= 75 ? 'hot' : score >= 45 ? 'warm' : 'qualifying';
      await supabase
        .from('leads')
        .update({
          score,
          status: newStatus,
          is_handoff_ready: isHandoffReady || false,
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

      // 5b. If booking was triggered, write a booking record in Supabase (fixes issue #3)
      if (bookingTriggered && bookingSettings?.booking_url) {
        const scheduledAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(); // 2 days from now as placeholder
        const { error: bookingErr } = await supabase.from('bookings').insert({
          tenant_id: tenantId,
          lead_id: lead.id,
          scheduled_at: scheduledAt,
          duration_mins: bookingSettings.meeting_duration_mins || 30,
          meeting_url: bookingSettings.booking_url,
          status: 'confirmed',
          source_channel: 'whatsapp',
          notes: `Booking link sent via WhatsApp AI. Lead self-scheduled via: ${bookingSettings.booking_url}`,
        });
        if (bookingErr) {
          console.error('[Booking Write Error]:', bookingErr);
        } else {
          console.log(`[Booking Created] Lead ${lead.id} booked via WhatsApp.`);
        }
        // Also update lead to is_handoff_ready
        await supabase.from('leads').update({ is_handoff_ready: true }).eq('id', lead.id);
      }

      // 6. Send Reply to WhatsApp via Evolution API
      const sendApiKey = body.apikey || data?.apikey || '75862081-0E3F-4326-850D-587B3D799D89';
      console.log(`[WhatsApp Outbound] To ${senderPhone} (score=${score}, status=${newStatus}): "${replyText}"`);

      try {
        const evoRes = await fetch(`${EVOLUTION_URL}/message/sendText/${instanceName}`, {
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
        const evoText = await evoRes.text();
        console.log(`[WhatsApp Outbound Result] Status: ${evoRes.status}`);
        if (evoRes.status !== 201) console.warn('[Outbound Body]:', evoText);
      } catch (err) {
        console.error('[WhatsApp Outbound Error]:', err);
      }

      return res.json({ status: 'success', replied: true, score, bookingTriggered });
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
