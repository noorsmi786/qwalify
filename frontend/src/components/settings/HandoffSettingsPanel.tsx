import { useState, useEffect } from 'react';
import {
  Send,
  CheckCircle2,
  Key,
  MessageSquare,
  Sparkles,
  ExternalLink,
  Radio,
  Clock,
  Save,
  Loader2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/store/authStore';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { toast } from 'sonner';

export function HandoffSettingsPanel() {
  const { tenant } = useAuthStore();
  const [channel, setChannel] = useState<'telegram' | 'whatsapp' | 'slack'>('telegram');
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [autoPauseOnHot, setAutoPauseOnHot] = useState(true);
  const [forwardMessagesToRep, setForwardMessagesToRep] = useState(true);

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);

  // Load existing settings
  useEffect(() => {
    async function loadSettings() {
      if (!tenant?.id) return;
      if (isSupabaseConfigured) {
        try {
          // 1. Check channel_connections
          const { data: conn } = await supabase
            .from('channel_connections')
            .select('config')
            .eq('tenant_id', tenant.id)
            .eq('channel', 'telegram_rep_handoff')
            .maybeSingle();

          if (conn?.config) {
            setBotToken(conn.config.bot_token || '');
            setChatId(conn.config.chat_id || '');
            setAutoPauseOnHot(conn.config.auto_pause ?? true);
            setForwardMessagesToRep(conn.config.forward_messages ?? true);
            return;
          }

          // 2. Check tenant settings
          const { data: tenantData } = await supabase
            .from('tenants')
            .select('settings')
            .eq('id', tenant.id)
            .maybeSingle();

          if (tenantData?.settings?.rep_settings) {
            const s = tenantData.settings.rep_settings;
            setBotToken(s.bot_token || '');
            setChatId(s.chat_id || '');
            setAutoPauseOnHot(s.auto_pause ?? true);
            setForwardMessagesToRep(s.forward_messages ?? true);
          }
        } catch (e) {
          console.warn('Error loading rep settings:', e);
        }
      }
    }
    loadSettings();
  }, [tenant?.id]);

  const handleSave = async () => {
    if (!tenant?.id) return;
    setSaving(true);
    try {
      const config = {
        bot_token: botToken.trim(),
        chat_id: chatId.trim(),
        auto_pause: autoPauseOnHot,
        forward_messages: forwardMessagesToRep,
        notification_channel: channel,
        updated_at: new Date().toISOString(),
      };

      if (isSupabaseConfigured) {
        // Save to channel_connections
        await supabase.from('channel_connections').upsert({
          tenant_id: tenant.id,
          channel: 'telegram_rep_handoff',
          status: 'connected',
          config,
          connected_at: new Date().toISOString(),
        }, { onConflict: 'tenant_id, channel' });

        // Also save to tenant settings for redundancy
        const { data: currentTenant } = await supabase.from('tenants').select('settings').eq('id', tenant.id).maybeSingle();
        const updatedSettings = {
          ...(currentTenant?.settings || {}),
          rep_settings: config,
          rep_telegram_chat_id: chatId.trim(),
          telegram_bot_token: botToken.trim(),
        };

        await supabase.from('tenants').update({ settings: updatedSettings }).eq('id', tenant.id);
      }

      toast.success('Rep notification settings saved!');
    } catch {
      toast.error('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestAlert = async () => {
    if (!chatId.trim()) {
      toast.error('Please enter your Telegram Chat ID first.');
      return;
    }
    if (!botToken.trim()) {
      toast.error('Please enter your Telegram Bot Token from @BotFather.');
      return;
    }

    setTesting(true);
    setTestSuccess(false);

    try {
      const res = await fetch('/api/handoff/test-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: tenant?.id,
          botToken: botToken.trim(),
          chatId: chatId.trim(),
          repName: 'Sales Rep',
        }),
      });

      const data = await res.json();
      if (data.ok || data.success) {
        setTestSuccess(true);
        toast.success('Test notification sent! Check your Telegram app 📱');
      } else {
        toast.error(`Telegram error: ${data.error || data.description || 'Could not send test message'}`);
      }
    } catch {
      // Direct client-side Telegram test fallback
      try {
        const directRes = await fetch(`https://api.telegram.org/bot${botToken.trim()}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId.trim(),
            text: `🔥 <b>[TEST ALERT] Qwalify Human Handoff</b>\n\n✅ Your Telegram notifications are connected successfully! When a lead reaches hot qualification or is manually flagged, you'll receive alerts right here.`,
            parse_mode: 'HTML',
          }),
        });
        const d = await directRes.json();
        if (d.ok) {
          setTestSuccess(true);
          toast.success('Test notification sent to your Telegram! 🎉');
        } else {
          toast.error(`Telegram API error: ${d.description || 'Check your token & chat ID'}`);
        }
      } catch {
        toast.error('Could not reach Telegram. Please verify your Bot Token.');
      }
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="border-amber-500/20 bg-navy-900/90 shadow-xl overflow-hidden">
      <CardContent className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-navy-700/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center text-xl flex-shrink-0">
              🔥
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                Human Handoff & Rep Alerts
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold">
                  Instant Alerts
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Automatically pause AI bot and notify your sales reps when a lead is hot so they can close the deal.
              </p>
            </div>
          </div>
        </div>

        {/* Channel Selector */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Notification Channel
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Telegram (Live) */}
            <button
              onClick={() => setChannel('telegram')}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                channel === 'telegram'
                  ? 'border-sky-500/50 bg-sky-500/10 shadow-[0_0_15px_rgba(14,165,233,0.15)]'
                  : 'border-navy-700 bg-navy-800/40 text-slate-400 hover:border-navy-600'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-lg">✈️</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-300 font-bold">
                  ● Live
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-200">Telegram</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Instant alerts & 2-way chat relay</p>
            </button>

            {/* WhatsApp Rep Alert (Stub) */}
            <div className="p-3.5 rounded-xl border border-navy-700 bg-navy-800/20 text-slate-500 opacity-60 cursor-not-allowed">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-lg">💬</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-navy-700 text-slate-400 flex items-center gap-1 font-mono">
                  <Clock className="w-2.5 h-2.5" /> Coming Soon
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-300">WhatsApp Alert</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Direct SMS/WhatsApp alert to rep</p>
            </div>

            {/* Slack (Stub) */}
            <div className="p-3.5 rounded-xl border border-navy-700 bg-navy-800/20 text-slate-500 opacity-60 cursor-not-allowed">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-lg">#️⃣</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-navy-700 text-slate-400 flex items-center gap-1 font-mono">
                  <Clock className="w-2.5 h-2.5" /> Coming Soon
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-300">Slack Channel</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Post hot leads in team channel</p>
            </div>
          </div>
        </div>

        {/* Telegram Configuration Form */}
        <div className="p-5 rounded-2xl bg-navy-950/70 border border-navy-800 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5" /> Rep Telegram Connection
            </p>
            <a
              href="https://t.me/BotFather"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 underline"
            >
              Get Bot Token from @BotFather <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Input
                label="Telegram Bot API Token"
                type="password"
                placeholder="123456789:ABCdefGhI..."
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                icon={<Key className="w-4 h-4 text-slate-500" />}
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Your custom Telegram bot used to send alert messages to reps.
              </p>
            </div>

            <div>
              <Input
                label="Rep's Telegram Chat ID"
                placeholder="e.g. 123456789"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                icon={<MessageSquare className="w-4 h-4 text-slate-500" />}
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Find your Chat ID by messaging <code className="text-sky-400">@userinfobot</code> on Telegram.
              </p>
            </div>
          </div>

          {/* How It Works Checklist */}
          <div className="p-3.5 rounded-xl bg-navy-900 border border-navy-800 space-y-2 text-xs text-slate-300">
            <p className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> How Human Handoff Works in 3 Steps:
            </p>
            <ul className="space-y-1 text-slate-400 pl-4 list-disc text-[11px] leading-relaxed">
              <li>When a lead reaches a score of <strong>75/100 ("Hot")</strong>, the bot pauses auto-replies.</li>
              <li>A Telegram alert is immediately sent to your Rep with an AI summary of what the lead wants.</li>
              <li>The rep can <strong>reply directly inside Telegram</strong> — their message is relayed straight to the customer on WhatsApp!</li>
            </ul>
          </div>

          {/* Behavior Toggles */}
          <div className="space-y-2.5 pt-1">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autoPauseOnHot}
                onChange={(e) => setAutoPauseOnHot(e.target.checked)}
                className="w-4 h-4 rounded accent-amber-500"
              />
              <span className="text-xs text-slate-300 font-medium">
                Auto-pause AI bot immediately when lead is scored Hot (Score $\ge 75$)
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={forwardMessagesToRep}
                onChange={(e) => setForwardMessagesToRep(e.target.checked)}
                className="w-4 h-4 rounded accent-amber-500"
              />
              <span className="text-xs text-slate-300 font-medium">
                Forward incoming customer messages to Rep's Telegram while bot is paused
              </span>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-navy-800">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleTestAlert}
                loading={testing}
                className="w-full sm:w-auto text-xs"
              >
                <Send className="w-3.5 h-3.5 mr-1 text-sky-400" />
                Send Test Alert
              </Button>

              {testSuccess && (
                <span className="text-xs text-teal-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Alert Delivered!
                </span>
              )}
            </div>

            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              loading={saving}
              className="w-full sm:w-auto bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Handoff Settings
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
