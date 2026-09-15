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

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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

// Helper: Call AI provider (Gemini, OpenAI, Groq, OpenRouter)
async function generateAIResponse({ provider, apiKey, model, context, conversationHistory, latestMessage }) {
  const systemPrompt = `You are an AI Sales Development Representative (SDR) for ${context.companyName || 'our company'}.
Your goal is to politely qualify incoming leads and assist them with information.
Rules:
1. Be friendly, concise, and helpful (max 2-3 sentences).
2. Ask 1 qualification question at a time (e.g. team size, timeline, budget, specific needs).
3. At the end of your response, output a score assessment in brackets: [SCORE: <0-100>]. Example: [SCORE: 75]
Current lead name: ${context.leadName || 'Prospect'}
Current score: ${context.currentScore || 10}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map((m) => ({
      role: m.sender === 'lead' ? 'user' : 'assistant',
      content: m.content,
    })),
    { role: 'user', content: latestMessage },
  ];

  // Default fallback reply
  let replyText = `Hi ${context.leadName || 'there'}! 👋 Thanks for reaching out to ${context.companyName}. How can we help your team today? [SCORE: 25]`;
  let score = 25;

  if (provider === 'gemini' && apiKey) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-1.5-flash'}:generateContent?key=${apiKey}`;
      const geminiBody = {
        contents: [
          { role: 'user', parts: [{ text: systemPrompt + '\n\nLead: ' + latestMessage }] }
        ]
      };
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiBody),
      });
      if (r.ok) {
        const d = await r.json();
        replyText = d.candidates?.[0]?.content?.parts?.[0]?.text || replyText;
      }
    } catch (e) {
      console.error('Gemini call error:', e);
    }
  } else if (apiKey) {
    // OpenAI-compatible format (OpenAI, Groq, OpenRouter, Mistral, Grok)
    let baseUrl = 'https://api.openai.com/v1/chat/completions';
    if (provider === 'groq') baseUrl = 'https://api.groq.com/openai/v1/chat/completions';
    if (provider === 'openrouter') baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
    if (provider === 'mistral') baseUrl = 'https://api.mistral.ai/v1/chat/completions';
    if (provider === 'grok') baseUrl = 'https://api.x.ai/v1/chat/completions';

    try {
      const r = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model || (provider === 'groq' ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini'),
          messages,
          temperature: 0.3,
        }),
      });
      if (r.ok) {
        const d = await r.json();
        replyText = d.choices?.[0]?.message?.content || replyText;
      }
    } catch (e) {
      console.error(`${provider} call error:`, e);
    }
  }

  // Extract score
  const scoreMatch = replyText.match(/\[SCORE:\s*(\d+)\]/i);
  if (scoreMatch) {
    score = Math.min(100, Math.max(0, parseInt(scoreMatch[1], 10)));
    replyText = replyText.replace(/\[SCORE:\s*\d+\]/i, '').trim();
  }

  return { replyText, score };
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

      // 4. Load Active AI Provider Config
      const { data: aiConfigs } = await supabase
        .from('ai_provider_configs')
        .select('*')
        .eq('tenant_id', tenantId);

      const activeAI = (aiConfigs || []).find((c) => c.is_active) || (aiConfigs || [])[0];

      // 5. Execute AI Turn
      const { replyText, score } = await generateAIResponse({
        provider: activeAI?.provider || 'gemini',
        apiKey: activeAI?.api_key || '',
        model: activeAI?.model || 'gemini-1.5-flash',
        context: {
          companyName: tenantName,
          leadName: pushName,
          currentScore: lead?.score || 15,
        },
        conversationHistory: [],
        latestMessage: messageText,
      });

      // Update lead score & status
      const newStatus = score >= 75 ? 'hot' : score >= 45 ? 'warm' : 'qualifying';
      await supabase
        .from('leads')
        .update({
          score,
          status: newStatus,
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

      // 6. Send Reply to WhatsApp via Evolution API
      console.log(`[WhatsApp Outbound] Replying to ${senderPhone}: "${replyText}"`);
      await fetch(`${EVOLUTION_URL}/message/sendText/${instanceName}`, {
        method: 'POST',
        headers: {
          apikey: EVOLUTION_API_KEY,
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0',
        },
        body: JSON.stringify({
          number: senderPhone,
          text: replyText,
        }),
      });

      return res.json({ status: 'success', replied: true, score });
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
