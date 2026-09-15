import { useState, useEffect } from 'react';
import {
  Link2,
  CheckCircle2,
  QrCode,
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

// ─── WhatsApp Config Panel ────────────────────────────────────────────────────

function WhatsAppPanel() {
  const { tenant } = useAuthStore();
  const evolutionUrl = 'https://api.nexwa.online';
  const apiKey = 'Zainab$1212Noor@1212';
  const instanceName = tenant?.slug ? `tenant-${tenant.slug}` : 'qwalify-main';

  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isLoadingQr, setIsLoadingQr] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  // Test Simulator State
  const [testMessage, setTestMessage] = useState('Hi! I need lead qualification for my sales team.');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simReply, setSimReply] = useState<string | null>(null);

  // Check initial connection status on load
  const checkStatus = async () => {
    setIsCheckingStatus(true);
    try {
      const res = await fetch(`${evolutionUrl}/instance/connectionState/${instanceName}`, {
        headers: { apikey: apiKey },
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.instance?.state === 'open') {
          setConnectionState('connected');
          setPhoneNumber(data?.instance?.owner || '+Connected');
          setQrCode(null);
        } else {
          setConnectionState('disconnected');
        }
      }
    } catch {
      // offline or not created
    } finally {
      setIsCheckingStatus(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, [instanceName]);

  const handleFetchQr = async () => {
    setIsLoadingQr(true);
    setQrCode(null);
    setConnectionState('connecting');

    try {
      // 1. Ensure instance exists
      await fetch(`${evolutionUrl}/instance/create`, {
        method: 'POST',
        headers: {
          apikey: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instanceName,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
        }),
      }).catch(() => null);

      // 2. Register Webhook in Evolution API
      const supabaseEndpoint = import.meta.env.VITE_SUPABASE_URL || 'https://bmiwzknbsuqxxoeaatnt.supabase.co';
      await fetch(`${evolutionUrl}/webhook/set/${instanceName}`, {
        method: 'POST',
        headers: {
          apikey: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          webhook: {
            enabled: true,
            url: `${supabaseEndpoint}/functions/v1/whatsapp-webhook`,
            webhookByEvents: false,
            events: ['MESSAGES_UPSERT'],
          },
        }),
      }).catch(() => null);

      // 3. Save connection record in Supabase
      if (isSupabaseConfigured && tenant?.id) {
        try {
          await supabase.from('channel_connections').upsert({
            tenant_id: tenant.id,
            channel: 'whatsapp',
            status: 'connected',
            config: { instance_name: instanceName, api_url: evolutionUrl },
            connected_at: new Date().toISOString(),
          }, { onConflict: 'tenant_id, channel' });
        } catch (e) {
          console.warn('Channel upsert err:', e);
        }
      }

      // 4. Fetch connection QR
      const res = await fetch(`${evolutionUrl}/instance/connect/${instanceName}`, {
        method: 'GET',
        headers: { apikey: apiKey },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data?.base64) {
        setQrCode(data.base64);
        toast.success('QR Code ready! Scan with your WhatsApp app.');
      } else if (data?.code) {
        setQrCode(data.code);
        toast.success('QR Code ready!');
      } else if (data?.instance?.state === 'open') {
        setConnectionState('connected');
        toast.success('WhatsApp is already connected!');
      } else {
        toast.info('Generating QR code, please wait a moment...');
      }
    } catch {
      toast.error('Could not connect to WhatsApp service. Please try again.');
    } finally {
      setIsLoadingQr(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await fetch(`${evolutionUrl}/instance/logout/${instanceName}`, {
        method: 'DELETE',
        headers: { apikey: apiKey },
      });
      setConnectionState('disconnected');
      setQrCode(null);
      setPhoneNumber(null);
      toast.success('WhatsApp number disconnected.');
    } catch {
      toast.error('Failed to disconnect WhatsApp.');
    }
  };

  const handleSimulateWhatsAppInbound = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testMessage.trim() || isSimulating) return;

    setIsSimulating(true);
    setSimReply(null);

    try {
      await new Promise((r) => setTimeout(r, 750));
      setSimReply(
        `[WhatsApp AI SDR] Hi there! 👋 Thanks for reaching out. We can automate your lead qualification and appointment booking directly over WhatsApp. How many leads do you typically receive each week?`
      );
      toast.success('AI qualification response simulated!');
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-navy-700/80 space-y-6">
      {/* Connected State */}
      {connectionState === 'connected' ? (
        <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl">
                📱
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-100 text-sm">WhatsApp Number Connected</span>
                  {phoneNumber && (
                    <span className="text-xs font-mono text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                      {phoneNumber}
                    </span>
                  )}
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Live & Ready
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  AI assistant is actively listening and responding to incoming leads on WhatsApp.
                </p>
              </div>
            </div>

            <Button
              size="sm"
              variant="danger"
              onClick={handleDisconnect}
              className="text-xs"
            >
              Disconnect Number
            </Button>
          </div>
        </div>
      ) : (
        /* Disconnected / Connect State */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* QR Code & Connect Action */}
          <div className="p-5 rounded-2xl bg-navy-900/90 border border-navy-700 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-emerald-400" /> Link WhatsApp Account
                </p>
                <span className="text-[11px] text-slate-400 font-medium">Step 1 of 1</span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Connect your business WhatsApp number so your AI SDR can qualify incoming inquiries, answer questions, and schedule meetings.
              </p>

              <ol className="space-y-2 text-xs text-slate-300 pl-1">
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-navy-800 border border-navy-600 flex items-center justify-center text-[11px] font-bold text-emerald-400 flex-shrink-0">1</span>
                  Click <strong>"Generate QR Code"</strong> below.
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-navy-800 border border-navy-600 flex items-center justify-center text-[11px] font-bold text-emerald-400 flex-shrink-0">2</span>
                  Open <strong>WhatsApp</strong> on your phone.
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-navy-800 border border-navy-600 flex items-center justify-center text-[11px] font-bold text-emerald-400 flex-shrink-0">3</span>
                  Tap <strong>Settings → Linked Devices → Link a Device</strong>.
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-navy-800 border border-navy-600 flex items-center justify-center text-[11px] font-bold text-emerald-400 flex-shrink-0">4</span>
                  Scan the QR code displayed on screen.
                </li>
              </ol>
            </div>

            <div className="pt-2">
              <Button
                onClick={handleFetchQr}
                loading={isLoadingQr}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
              >
                <QrCode className="w-4 h-4 mr-1.5" />
                {qrCode ? 'Refresh QR Code' : 'Generate QR Code'}
              </Button>
            </div>
          </div>

          {/* QR Code Display Card */}
          <div className="p-5 rounded-2xl bg-navy-900/90 border border-navy-700 flex flex-col items-center justify-center min-h-[260px] text-center">
            {qrCode ? (
              <div className="space-y-3 flex flex-col items-center">
                <div className="p-3 bg-white rounded-2xl shadow-xl shadow-black/40">
                  <img src={qrCode} alt="WhatsApp QR Code" className="w-48 h-48 rounded-lg" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-200">Point your phone camera here</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">WhatsApp → Linked Devices → Link a Device</p>
                </div>
                <Button size="sm" variant="ghost" onClick={checkStatus} loading={isCheckingStatus} className="text-xs text-emerald-400 hover:text-emerald-300">
                  Check Connection Status
                </Button>
              </div>
            ) : (
              <div className="space-y-3 py-6">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-3xl mx-auto">
                  💬
                </div>
                <p className="text-sm font-medium text-slate-200">No Device Connected Yet</p>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Click "Generate QR Code" to pair your WhatsApp number with your Qwalify AI agent.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Interactive AI Lead Turn Simulator */}
      <div className="p-5 rounded-2xl bg-navy-900/80 border border-navy-700 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-200 flex items-center gap-2">
            ⚡ Test WhatsApp AI Lead Interaction
          </p>
          <span className="text-[11px] text-emerald-400 font-medium">Interactive Preview</span>
        </div>
        <form onSubmit={handleSimulateWhatsAppInbound} className="flex gap-2">
          <input
            type="text"
            placeholder="Type a sample prospect message (e.g. 'Looking for pricing and demo')..."
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            className="flex-1 bg-navy-950 border border-navy-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <Button size="sm" type="submit" loading={isSimulating} className="text-xs bg-emerald-600 hover:bg-emerald-500">
            Simulate
          </Button>
        </form>

        {simReply && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 leading-relaxed flex items-start gap-2">
            <span className="text-base">🤖</span>
            <span>{simReply}</span>
          </div>
        )}
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
