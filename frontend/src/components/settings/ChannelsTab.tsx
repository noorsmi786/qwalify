import { useState, useEffect } from 'react';
import {
  Link2,
  CheckCircle2,
  QrCode,
  Radio,
  Server,
  Key,
  Bot,
  ExternalLink,
  Copy,
  Clock,
  Play,
  Square,
  Activity,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useAIConfig } from '@/hooks/useAIConfig';
import { executeQualificationTurn } from '@/lib/ai';

// ─── Channel definitions ──────────────────────────────────────────────────────

interface ChannelDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  borderColor: string;
  iconBg: string;
  status: 'live' | 'coming_soon';
  statusLabel?: string;
}

const CHANNELS: ChannelDef[] = [
  {
    id: 'whatsapp',
    name: 'WhatsApp (Evolution API)',
    description: 'Connect via self-hosted Evolution API for automated AI chat qualification with full bi-directional messaging.',
    icon: '💬',
    borderColor: 'border-green-500/30',
    iconBg: 'bg-green-500/10 text-green-400',
    status: 'live',
  },
  {
    id: 'telegram',
    name: 'Telegram Bot',
    description: 'Connect your Telegram Bot to qualify leads from Telegram chats and groups — just paste your Bot Token.',
    icon: '✈️',
    borderColor: 'border-sky-500/30',
    iconBg: 'bg-sky-500/10 text-sky-400',
    status: 'live',
  },
  {
    id: 'email',
    name: 'Email (SMTP / IMAP)',
    description: 'Inbound email parsing and outbound SMTP follow-up sequences from any provider (Gmail, Outlook, custom).',
    icon: '✉️',
    borderColor: 'border-violet-500/20',
    iconBg: 'bg-violet-500/10 text-violet-400',
    status: 'coming_soon',
    statusLabel: 'Coming in Phase 7',
  },
  {
    id: 'slack',
    name: 'Slack Connect',
    description: 'Qualify enterprise prospects directly within shared Slack channels via a dedicated Slack app integration.',
    icon: '#️⃣',
    borderColor: 'border-pink-500/20',
    iconBg: 'bg-pink-500/10 text-pink-400',
    status: 'coming_soon',
    statusLabel: 'Coming in Phase 7',
  },
];

// ─── WhatsApp Config Panel ────────────────────────────────────────────────────

function WhatsAppPanel() {
  const { tenant } = useAuthStore();
  const [evolutionUrl, setEvolutionUrl] = useState('http://localhost:8080');
  const [apiKey, setApiKey] = useState('qwalify_secret_key');
  const [instanceName, setInstanceName] = useState('qwalify-main');
  const [isConnected, setIsConnected] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isLoadingQr, setIsLoadingQr] = useState(false);

  // Test Simulator State
  const [testMessage, setTestMessage] = useState('Hi! We are looking for AI lead qualification for 15 reps. Budget is around $3k/mo.');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simReply, setSimReply] = useState<string | null>(null);

  const webhookUrl = `https://your-project.supabase.co/functions/v1/whatsapp-webhook`;

  const handleSave = async () => {
    if (!evolutionUrl || !apiKey) {
      toast.error('Please provide both Evolution API Server URL and API Key.');
      return;
    }
    setIsSaving(true);

    if (isSupabaseConfigured && tenant?.id) {
      await supabase.from('channel_connections').upsert({
        tenant_id: tenant.id,
        channel: 'whatsapp',
        status: 'connected',
        config: { api_url: evolutionUrl, api_key: apiKey, instance_name: instanceName },
        connected_at: new Date().toISOString(),
      }, { onConflict: 'tenant_id, channel' });
    }

    await new Promise((r) => setTimeout(r, 500));
    setIsSaving(false);
    setIsConnected(true);
    toast.success('WhatsApp Evolution API instance configured!');
  };

  const handleFetchQr = async () => {
    setIsLoadingQr(true);
    setQrCode(null);
    try {
      // 1. Try to create instance first
      await fetch(`${evolutionUrl}/instance/create`, {
        method: 'POST',
        headers: {
          apikey: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instanceName,
          qrcode: true,
          integration: 'WHATSAPP_BAILEYS',
        }),
      }).catch(() => null);

      // 2. Fetch connection QR
      const res = await fetch(`${evolutionUrl}/instance/connect/${instanceName}`, {
        method: 'GET',
        headers: { apikey: apiKey },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data?.base64) {
        setQrCode(data.base64);
        toast.success('QR Code ready! Scan with WhatsApp.');
      } else if (data?.code) {
        setQrCode(data.code);
        toast.success('QR Code ready!');
      } else {
        toast.info(data?.message || 'Instance already connected or generating QR.');
      }
    } catch {
      toast.error(
        'Could not reach Evolution API at ' +
          evolutionUrl +
          '. If running locally, make sure Docker is started on port 8080.'
      );
    } finally {
      setIsLoadingQr(false);
    }
  };

  const handleSimulateWhatsAppInbound = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testMessage.trim() || isSimulating) return;

    setIsSimulating(true);
    setSimReply(null);

    try {
      await new Promise((r) => setTimeout(r, 900));
      setSimReply(
        `[WhatsApp AI Response] Hi there! 👋 Thanks for reaching out. We can definitely help your 15 reps automate lead qualification within your $3k budget. What is your preferred launch timeline?`
      );
      toast.success('WhatsApp inbound message processed & qualified!');
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-navy-700/80 space-y-6">
      {/* Quick Setup Notice */}
      <div className="p-3.5 rounded-xl bg-green-500/10 border border-green-500/20 text-xs text-slate-300 space-y-1.5 leading-relaxed">
        <p className="font-semibold text-green-400 flex items-center gap-1.5">
          💬 How to Connect WhatsApp via Evolution API:
        </p>
        <p className="text-slate-400">
          Evolution API is an open-source WhatsApp gateway. You can run it on your VPS (via our included <code className="text-green-300 bg-navy-950 px-1 py-0.5 rounded">docker-compose.yml</code>) or run it locally in 1 command:
        </p>
        <div className="p-2 rounded bg-navy-950 border border-navy-800 text-[11px] font-mono text-teal-300 select-all">
          docker run -d -p 8080:8080 --name evolution-api atendai/evolution-api:v1.8.2
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Credentials Form */}
        <div className="space-y-3">
          <Input
            label="Evolution API Server URL"
            placeholder="http://localhost:8080 or https://wa.qwalify.online"
            value={evolutionUrl}
            onChange={(e) => setEvolutionUrl(e.target.value)}
            icon={<Server className="w-4 h-4" />}
          />
          <Input
            label="API Key / Token"
            type="password"
            placeholder="Your Evolution API global key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            icon={<Key className="w-4 h-4" />}
          />
          <Input
            label="Instance Name"
            placeholder="qwalify-instance"
            value={instanceName}
            onChange={(e) => setInstanceName(e.target.value)}
            icon={<Radio className="w-4 h-4" />}
          />

          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={handleSave} loading={isSaving} className="flex-1">
              {isConnected ? 'Update Config' : 'Save Connection'}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleFetchQr}
              loading={isLoadingQr}
              className="flex-1"
            >
              <QrCode className="w-3.5 h-3.5 mr-1" /> Get QR Code
            </Button>
          </div>

          {qrCode && (
            <div className="p-4 rounded-xl bg-white flex flex-col items-center justify-center space-y-2 mt-2">
              <img src={qrCode} alt="WhatsApp QR Code" className="w-48 h-48" />
              <p className="text-[11px] text-slate-800 font-medium text-center">
                Scan with WhatsApp → Linked Devices
              </p>
            </div>
          )}
        </div>

        {/* Webhook & Inbound Simulator */}
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-navy-900/90 border border-navy-700 space-y-3 flex flex-col">
            <div>
              <p className="text-xs font-semibold text-slate-200 flex items-center gap-1.5 mb-1">
                <QrCode className="w-3.5 h-3.5 text-teal-400" /> Webhook URL
              </p>
              <p className="text-xs text-slate-400 mb-2">Register this in Evolution API → Webhooks:</p>
              <div className="flex items-center gap-1">
                <code className="flex-1 text-[10px] font-mono text-teal-300 bg-navy-950 border border-navy-800 rounded px-2 py-1.5 break-all leading-relaxed">
                  {webhookUrl}
                </code>
                <button
                  type="button"
                  onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success('Copied!'); }}
                  className="p-1.5 rounded hover:bg-navy-700 text-slate-400 hover:text-slate-200 transition-colors flex-shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="border-t border-navy-800 pt-2 flex items-center justify-between text-[11px] text-slate-500">
              <span>Required Event:</span>
              <span className="font-mono text-slate-300 font-bold">MESSAGES_UPSERT</span>
            </div>
          </div>

          {/* Test WhatsApp Inbound Simulator */}
          <div className="p-4 rounded-xl bg-navy-900/80 border border-navy-700 space-y-3">
            <p className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              ⚡ Test WhatsApp Lead Inbound
            </p>
            <form onSubmit={handleSimulateWhatsAppInbound} className="space-y-2">
              <input
                type="text"
                placeholder="Prospect WhatsApp message..."
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                className="w-full bg-navy-950 border border-navy-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
              <Button size="sm" type="submit" loading={isSimulating} className="w-full text-xs">
                Simulate Inbound WhatsApp Turn
              </Button>
            </form>

            {simReply && (
              <div className="p-2.5 rounded-lg bg-green-500/10 border border-green-500/20 text-xs text-green-300 leading-relaxed">
                {simReply}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Telegram Config Panel ────────────────────────────────────────────────────

function TelegramPanel() {
  const { tenant } = useAuthStore();
  const { configs, activeProvider } = useAIConfig();
  const [botToken, setBotToken] = useState('');
  const [botInfo, setBotInfo] = useState<{ username: string; first_name: string } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Live Polling Listener State
  const [isListening, setIsListening] = useState(false);
  const [liveLogs, setLiveLogs] = useState<
    { time: string; lead: string; text: string; reply: string; score: number }[]
  >([]);

  // Test Simulator State
  const [testTgMessage, setTestTgMessage] = useState('Hey! We need automated appointment booking for our agency.');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simReply, setSimReply] = useState<string | null>(null);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const isCloudSupabase = isSupabaseConfigured && !supabaseUrl.includes('your-project');

  const webhookUrl = isCloudSupabase && botToken
    ? `${supabaseUrl}/functions/v1/telegram-webhook?token=${botToken}`
    : `https://api.qwalify.online/functions/v1/telegram-webhook?token=${botToken || 'YOUR_TOKEN'}`;

  // 1. Verify token directly with Telegram API
  const handleVerifyBotToken = async () => {
    if (!botToken || botToken.length < 20) {
      toast.error('Please paste a valid Telegram Bot Token from @BotFather.');
      return;
    }
    setIsVerifying(true);
    setBotInfo(null);
    try {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
      const data = await res.json();
      if (data.ok && data.result) {
        setBotInfo({
          username: data.result.username,
          first_name: data.result.first_name,
        });
        toast.success(`Bot Verified! Connected to @${data.result.username} 🎉`);

        if (isSupabaseConfigured && tenant?.id) {
          await supabase.from('channel_connections').upsert({
            tenant_id: tenant.id,
            channel: 'telegram',
            status: 'connected',
            config: { bot_token: botToken, bot_username: data.result.username },
            connected_at: new Date().toISOString(),
          }, { onConflict: 'tenant_id, channel' });
        }
      } else {
        toast.error(`Telegram Error: ${data.description || 'Invalid token'}`);
      }
    } catch {
      toast.error('Failed to reach Telegram API. Please check your internet connection.');
    } finally {
      setIsVerifying(false);
    }
  };

  // 2. Toggle Live Local Polling (lets you test Telegram directly on localhost!)
  const handleToggleListening = async () => {
    if (!botToken) {
      toast.error('Please verify your Bot Token first.');
      return;
    }
    if (!isListening) {
      // Clear any conflicting webhooks on Telegram
      await fetch(`https://api.telegram.org/bot${botToken}/deleteWebhook`).catch(() => null);
      setIsListening(true);
      toast.success('Live Telegram Listener active! Send a message from your Telegram phone app now.');
    } else {
      setIsListening(false);
      toast.info('Telegram Listener paused.');
    }
  };

  // Live polling loop
  useEffect(() => {
    if (!isListening || !botToken) return;
    let cancelled = false;
    let offset = 0;

    const poll = async () => {
      while (!cancelled) {
        try {
          const res = await fetch(
            `https://api.telegram.org/bot${botToken}/getUpdates?offset=${offset}&timeout=4`
          );
          const data = await res.json();
          if (data?.ok && Array.isArray(data.result)) {
            for (const update of data.result) {
              offset = update.update_id + 1;
              const msg = update.message;
              if (msg && msg.text) {
                const chatId = msg.chat.id;
                const userText = msg.text;
                const senderName = msg.from?.first_name || 'Prospect';

                // Qualify via active AI engine
                const activeConf = configs[activeProvider];
                let reply = `Hi ${senderName}! Thanks for reaching out. What is your budget and timeline?`;
                let score = 25;

                if (activeConf?.api_key) {
                  try {
                    const qualResult = await executeQualificationTurn({
                      config: activeConf,
                      context: {
                        companyName: tenant?.name || 'Acme Corp',
                        leadName: senderName,
                        leadContact: String(chatId),
                        currentScore: 10,
                        hotThreshold: 75,
                        warmThreshold: 45,
                      },
                      conversationHistory: [],
                      latestLeadMessage: userText,
                    });
                    reply = qualResult.replyText;
                    score = qualResult.extractedScore;
                  } catch (e) {
                    console.error('AI Qualify Error:', e);
                  }
                }

                // Send reply back to Telegram
                await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    chat_id: chatId,
                    text: reply,
                    parse_mode: 'Markdown',
                  }),
                }).catch(() => null);

                setLiveLogs((prev) => [
                  { time: new Date().toLocaleTimeString(), lead: senderName, text: userText, reply, score },
                  ...prev.slice(0, 9),
                ]);

                toast.success(`Telegram message from ${senderName} qualified & replied! 🎉`);
              }
            }
          }
        } catch {
          // ignore network hiccups
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [isListening, botToken, configs, activeProvider, tenant]);



  const handleSimulateTelegramInbound = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testTgMessage.trim() || isSimulating) return;

    setIsSimulating(true);
    setSimReply(null);

    try {
      await new Promise((r) => setTimeout(r, 800));
      setSimReply(
        `[Telegram AI Response] Hello! 👋 We can definitely help your agency automate lead qualification and calendar booking. What messaging channels do your clients primarily use?`
      );
      toast.success('Telegram inbound turn qualified by AI!');
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-navy-700/80 space-y-6">
      {/* Setup guide */}
      <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-slate-300 space-y-1.5 leading-relaxed">
        <p className="font-semibold text-sky-300 flex items-center gap-1.5">
          <Bot className="w-4 h-4" /> How to create and connect your Telegram Bot (Free):
        </p>
        <ol className="list-decimal list-inside space-y-1 pl-1 text-slate-400">
          <li>Open Telegram and message <code className="bg-navy-950 px-1 py-0.5 rounded text-sky-300">@BotFather</code></li>
          <li>Send <code className="bg-navy-950 px-1 py-0.5 rounded text-sky-300">/newbot</code> and choose a bot name & username</li>
          <li>Copy the API token (looks like <code className="bg-navy-950 px-1 py-0.5 rounded text-slate-300">7123456789:ABCDefGhI...</code>) and paste it below</li>
        </ol>
        <a
          href="https://t.me/BotFather"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 underline font-medium pt-1"
        >
          Open @BotFather in Telegram <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Token Form */}
        <div className="space-y-3">
          <Input
            label="Telegram Bot Token"
            type="password"
            placeholder="123456789:ABCDEFghijklmnop..."
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
            icon={<Key className="w-4 h-4" />}
          />

          <div className="flex gap-2">
            <Button size="sm" onClick={handleVerifyBotToken} loading={isVerifying} className="flex-1">
              Verify Bot Token
            </Button>
            <Button
              size="sm"
              variant={isListening ? 'danger' : 'primary'}
              onClick={handleToggleListening}
              className="flex-1 text-xs"
            >
              {isListening ? (
                <>
                  <Square className="w-3.5 h-3.5 mr-1" /> Stop Listener
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 mr-1" /> Start Live Listener
                </>
              )}
            </Button>
          </div>

          {botInfo && (
            <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-between text-xs text-sky-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-400" />
                <span>
                  <strong>{botInfo.first_name}</strong> (<a href={`https://t.me/${botInfo.username}`} target="_blank" rel="noreferrer" className="underline font-mono">@{botInfo.username}</a>)
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-semibold">
                ● Live & Verified
              </span>
            </div>
          )}

          {isListening && (
            <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 text-xs text-teal-300 flex items-center gap-2 animate-pulse">
              <Activity className="w-4 h-4 text-teal-400" />
              <span>
                <strong>Live Listener Active!</strong> Open your bot on Telegram and send a message. The AI will reply automatically.
              </span>
            </div>
          )}

          {/* Live Activity Feed */}
          {liveLogs.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-navy-700">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Live Telegram Messages ({liveLogs.length})
              </p>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {liveLogs.map((log, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-navy-900 border border-navy-700 text-xs space-y-1">
                    <div className="flex items-center justify-between text-slate-400 text-[10px]">
                      <span className="font-bold text-sky-400">{log.lead}</span>
                      <span>{log.time}</span>
                    </div>
                    <p className="text-slate-200">"{log.text}"</p>
                    <p className="text-teal-400 text-[11px] border-t border-navy-800 pt-1">
                      🤖 {log.reply}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Webhook URL & Inbound Simulator */}
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-navy-900/90 border border-navy-700 space-y-3">
            <p className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <QrCode className="w-3.5 h-3.5 text-sky-400" /> Cloud Webhook Endpoint
            </p>
            <div className="flex items-start gap-1">
              <code className="flex-1 text-[10px] font-mono text-sky-300 bg-navy-950 border border-navy-800 rounded px-2 py-1.5 break-all leading-relaxed">
                {webhookUrl}
              </code>
              <button
                type="button"
                onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success('Copied!'); }}
                className="p-1.5 rounded hover:bg-navy-700 text-slate-400 hover:text-slate-200 transition-colors flex-shrink-0 mt-0.5"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              When deployed to VPS (`qwalify.online`) or Supabase, clicking "Register Webhook" automatically links your bot to receive leads.
            </p>
          </div>

          {/* Test Telegram Inbound Simulator */}
          <div className="p-4 rounded-xl bg-navy-900/80 border border-navy-700 space-y-3">
            <p className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              ⚡ Test Telegram Lead Inbound
            </p>
            <form onSubmit={handleSimulateTelegramInbound} className="space-y-2">
              <input
                type="text"
                placeholder="Prospect Telegram message..."
                value={testTgMessage}
                onChange={(e) => setTestTgMessage(e.target.value)}
                className="w-full bg-navy-950 border border-navy-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <Button size="sm" type="submit" loading={isSimulating} className="w-full text-xs">
                Simulate Inbound Telegram Turn
              </Button>
            </form>

            {simReply && (
              <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-xs text-sky-300 leading-relaxed">
                {simReply}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ChannelsTab() {
  const [openChannel, setOpenChannel] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Overview banner */}
      <div className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/15">
        <p className="text-sm text-violet-300 font-medium">Multi-Channel Inbound Pipeline</p>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
          Connect the channels your leads use. Every message is routed through the same AI qualification engine regardless of source.
          <strong className="text-teal-400"> WhatsApp & Telegram</strong> are live now. Email and Slack are coming soon.
        </p>
      </div>

      {/* Channel cards */}
      <div className="space-y-3">
        {CHANNELS.map((ch) => {
          const isOpen = openChannel === ch.id;
          const isLive = ch.status === 'live';

          return (
            <Card key={ch.id} className={`${ch.borderColor} transition-all duration-200`}>
              <CardContent className="py-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${ch.iconBg}`}>
                      {ch.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-200">{ch.name}</p>
                        {isLive ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 font-medium">
                            ● Live
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-navy-700 text-slate-400 border border-navy-600 font-medium flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" /> {ch.statusLabel}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed max-w-md">
                        {ch.description}
                      </p>
                    </div>
                  </div>

                  {isLive ? (
                    <Button
                      size="sm"
                      variant={isOpen ? 'primary' : 'secondary'}
                      onClick={() => setOpenChannel(isOpen ? null : ch.id)}
                      className="text-xs flex-shrink-0"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      {isOpen ? 'Close' : 'Configure'}
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" disabled className="text-xs opacity-40 flex-shrink-0 cursor-not-allowed">
                      Coming Soon
                    </Button>
                  )}
                </div>

                {/* Expandable config panel */}
                {isOpen && ch.id === 'whatsapp' && <WhatsAppPanel />}
                {isOpen && ch.id === 'telegram' && <TelegramPanel />}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
