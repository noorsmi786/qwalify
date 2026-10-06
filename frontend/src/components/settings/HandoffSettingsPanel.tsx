import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Send,
  CheckCircle2,
  Key,
  MessageSquare,
  Sparkles,
  ExternalLink,
  Radio,
  Save,
  Loader2,
  Phone,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/store/authStore';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { toast } from 'sonner';

export function HandoffSettingsPanel() {
  const { tenant } = useAuthStore();

  // Channel selections
  const [telegramEnabled, setTelegramEnabled] = useState(true);
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');

  // WhatsApp Rep Alert
  const [whatsAppEnabled, setWhatsAppEnabled] = useState(false);
  const [whatsAppRepPhone, setWhatsAppRepPhone] = useState('');
  const [isWhatsAppConnected, setIsWhatsAppConnected] = useState(false);
  const [whatsAppInstance, setWhatsAppInstance] = useState<string | null>(null);

  // Alert triggers & preferences
  const [alertOnHotScore, setAlertOnHotScore] = useState(true);
  const [alertOnManualFlag, setAlertOnManualFlag] = useState(true);
  const [autoPauseOnHot, setAutoPauseOnHot] = useState(true);
  const [forwardMessagesToRep, setForwardMessagesToRep] = useState(true);

  const [saving, setSaving] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [telegramTestSuccess, setTelegramTestSuccess] = useState(false);

  const [testingWhatsApp, setTestingWhatsApp] = useState(false);
  const [whatsAppTestSuccess, setWhatsAppTestSuccess] = useState(false);

  // Load existing settings & WhatsApp connection status
  useEffect(() => {
    async function loadConfig() {
      if (!tenant?.id || !isSupabaseConfigured) return;

      try {
        // 1. Check if customer WhatsApp is connected in channel_connections
        const { data: waConn } = await supabase
          .from('channel_connections')
          .select('*')
          .eq('tenant_id', tenant.id)
          .eq('channel', 'whatsapp')
          .maybeSingle();

        if (waConn?.status === 'connected' || waConn?.config?.phone_number) {
          setIsWhatsAppConnected(true);
          setWhatsAppInstance(waConn.config?.instance_name || null);
        }

        // 2. Check rep handoff settings
        const { data: handoffConn } = await supabase
          .from('channel_connections')
          .select('config')
          .eq('tenant_id', tenant.id)
          .eq('channel', 'rep_handoff_settings')
          .maybeSingle();

        if (handoffConn?.config) {
          const c = handoffConn.config;
          setTelegramEnabled(c.telegram_enabled ?? true);
          setTelegramBotToken(c.telegram_bot_token || '');
          setTelegramChatId(c.telegram_chat_id || '');
          setWhatsAppEnabled(c.whatsapp_enabled ?? false);
          setWhatsAppRepPhone(c.whatsapp_rep_phone || '');
          setAlertOnHotScore(c.alert_on_hot_score ?? true);
          setAlertOnManualFlag(c.alert_on_manual_flag ?? true);
          setAutoPauseOnHot(c.auto_pause_on_hot ?? true);
          setForwardMessagesToRep(c.forward_messages_to_rep ?? true);
          return;
        }

        // 3. Fallback: check tenant settings
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('settings')
          .eq('id', tenant.id)
          .maybeSingle();

        if (tenantData?.settings?.rep_settings) {
          const s = tenantData.settings.rep_settings;
          setTelegramEnabled(s.telegram_enabled ?? true);
          setTelegramBotToken(s.telegram_bot_token || '');
          setTelegramChatId(s.telegram_chat_id || '');
          setWhatsAppEnabled(s.whatsapp_enabled ?? false);
          setWhatsAppRepPhone(s.whatsapp_rep_phone || '');
          setAlertOnHotScore(s.alert_on_hot_score ?? true);
          setAlertOnManualFlag(s.alert_on_manual_flag ?? true);
          setAutoPauseOnHot(s.auto_pause_on_hot ?? true);
          setForwardMessagesToRep(s.forward_messages_to_rep ?? true);
        }
      } catch (e) {
        console.warn('Error loading handoff settings:', e);
      }
    }

    loadConfig();
  }, [tenant?.id]);

  const handleSave = async () => {
    if (!tenant?.id) return;
    setSaving(true);
    try {
      const config = {
        telegram_enabled: telegramEnabled,
        telegram_bot_token: telegramBotToken.trim(),
        telegram_chat_id: telegramChatId.trim(),
        whatsapp_enabled: whatsAppEnabled,
        whatsapp_rep_phone: whatsAppRepPhone.trim(),
        alert_on_hot_score: alertOnHotScore,
        alert_on_manual_flag: alertOnManualFlag,
        auto_pause_on_hot: autoPauseOnHot,
        forward_messages_to_rep: forwardMessagesToRep,
        updated_at: new Date().toISOString(),
      };

      if (isSupabaseConfigured) {
        // Save to channel_connections
        await supabase.from('channel_connections').upsert({
          tenant_id: tenant.id,
          channel: 'rep_handoff_settings',
          status: 'connected',
          config,
          connected_at: new Date().toISOString(),
        }, { onConflict: 'tenant_id, channel' });

        // Save to tenant settings for redundancy
        const { data: currentTenant } = await supabase.from('tenants').select('settings').eq('id', tenant.id).maybeSingle();
        const updatedSettings = {
          ...(currentTenant?.settings || {}),
          rep_settings: config,
          rep_telegram_chat_id: telegramChatId.trim(),
          telegram_bot_token: telegramBotToken.trim(),
        };

        await supabase.from('tenants').update({ settings: updatedSettings }).eq('id', tenant.id);
      }

      toast.success('Handoff & Rep Alert settings saved!');
    } catch {
      toast.error('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestTelegram = async () => {
    if (!telegramChatId.trim()) {
      toast.error('Please enter your Telegram Chat ID first.');
      return;
    }
    if (!telegramBotToken.trim()) {
      toast.error('Please enter your Telegram Bot Token.');
      return;
    }

    setTestingTelegram(true);
    setTelegramTestSuccess(false);

    try {
      const res = await fetch('/api/handoff/test-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: tenant?.id,
          botToken: telegramBotToken.trim(),
          chatId: telegramChatId.trim(),
          repName: 'Sales Rep',
        }),
      });

      const data = await res.json();
      if (data.ok || data.success) {
        setTelegramTestSuccess(true);
        toast.success('Telegram test alert delivered! 📱');
      } else {
        toast.error(`Telegram error: ${data.error || data.description || 'Could not send alert'}`);
      }
    } catch {
      toast.error('Could not dispatch Telegram alert.');
    } finally {
      setTestingTelegram(false);
    }
  };

  const handleTestWhatsApp = async () => {
    if (!whatsAppRepPhone.trim()) {
      toast.error("Please enter the rep's WhatsApp phone number.");
      return;
    }

    setTestingWhatsApp(true);
    setWhatsAppTestSuccess(false);

    try {
      const res = await fetch('/api/handoff/test-whatsapp-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: tenant?.id,
          repPhone: whatsAppRepPhone.trim(),
          instanceName: whatsAppInstance,
        }),
      });

      const data = await res.json();
      if (data.success || data.ok) {
        setWhatsAppTestSuccess(true);
        toast.success('WhatsApp test alert delivered to rep! 💬');
      } else {
        toast.error(`WhatsApp error: ${data.error || 'Check that your WhatsApp channel is connected'}`);
      }
    } catch {
      toast.error('Failed to send WhatsApp alert.');
    } finally {
      setTestingWhatsApp(false);
    }
  };

  return (
    <Card className="border-amber-500/20 bg-navy-900/90 shadow-xl overflow-hidden">
      <CardContent className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-navy-700/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center text-xl flex-shrink-0">
              ⚡
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                Handoff Alert Channels & Preferences
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold">
                  Rep Notifications
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Choose how your team gets alerted when a lead requires human closing.
              </p>
            </div>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            loading={saving}
            className="bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs self-end sm:self-center"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save All Settings
          </Button>
        </div>

        {/* ─── 1. TELEGRAM ALERTS SECTION ─────────────────────────────────── */}
        <div className="p-5 rounded-2xl bg-navy-950/70 border border-navy-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={telegramEnabled}
                  onChange={(e) => setTelegramEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-navy-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
              </label>
              <span className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                <span>✈️ Telegram Alerts</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 font-bold">
                  Recommended
                </span>
              </span>
            </div>

            <a
              href="https://t.me/BotFather"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 underline"
            >
              Get Bot Token from @BotFather <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {telegramEnabled && (
            <div className="space-y-4 pt-2 border-t border-navy-800/80">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Handoff Telegram Bot Token"
                    type="password"
                    placeholder="123456789:ABCdefGhI..."
                    value={telegramBotToken}
                    onChange={(e) => setTelegramBotToken(e.target.value)}
                    icon={<Key className="w-4 h-4 text-slate-500" />}
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Dedicated bot token used to send real-time alerts to your sales reps.
                  </p>
                </div>

                <div>
                  <Input
                    label="Rep's Telegram Chat ID"
                    placeholder="e.g. 123456789"
                    value={telegramChatId}
                    onChange={(e) => setTelegramChatId(e.target.value)}
                    icon={<MessageSquare className="w-4 h-4 text-slate-500" />}
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Message <code className="text-sky-400">@userinfobot</code> on Telegram to get your numeric ID.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleTestTelegram}
                  loading={testingTelegram}
                  className="text-xs"
                >
                  <Send className="w-3.5 h-3.5 mr-1 text-sky-400" />
                  Test Telegram Alert
                </Button>

                {telegramTestSuccess && (
                  <span className="text-xs text-teal-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Telegram Alert Sent Successfully!
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ─── 2. WHATSAPP ALERTS SECTION (REUSES EXISTING CONNECTION) ─────── */}
        <div className="p-5 rounded-2xl bg-navy-950/70 border border-navy-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={whatsAppEnabled}
                  onChange={(e) => setWhatsAppEnabled(e.target.checked)}
                  className="sr-only peer"
                  disabled={!isWhatsAppConnected}
                />
                <div className={`w-9 h-5 bg-navy-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all ${
                  isWhatsAppConnected ? 'peer-checked:bg-green-500' : 'opacity-40 cursor-not-allowed'
                }`}></div>
              </label>
              <span className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                <span>💬 WhatsApp Rep Alerts</span>
                {isWhatsAppConnected ? (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-green-500/20 text-green-300 font-bold">
                    ● Authenticated via Channels
                  </span>
                ) : (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-medium">
                    Not Connected
                  </span>
                )}
              </span>
            </div>
          </div>

          {!isWhatsAppConnected ? (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-amber-300">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>To send alerts via WhatsApp, your WhatsApp instance must be connected first in Channels.</span>
              </div>
              <Link
                to="/bot/channels"
                className="text-xs font-semibold text-amber-400 hover:text-amber-300 underline whitespace-nowrap flex items-center gap-1"
              >
                Connect WhatsApp <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          ) : (
            whatsAppEnabled && (
              <div className="space-y-4 pt-2 border-t border-navy-800/80">
                <div>
                  <Input
                    label="Rep's WhatsApp Phone Number (with Country Code)"
                    placeholder="e.g. +14155552671 or 923001234567"
                    value={whatsAppRepPhone}
                    onChange={(e) => setWhatsAppRepPhone(e.target.value)}
                    icon={<Phone className="w-4 h-4 text-slate-500" />}
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    No re-pairing needed. Alerts will be automatically sent to this number through your connected WhatsApp connection.
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleTestWhatsApp}
                    loading={testingWhatsApp}
                    className="text-xs"
                  >
                    <Send className="w-3.5 h-3.5 mr-1 text-green-400" />
                    Test WhatsApp Alert
                  </Button>

                  {whatsAppTestSuccess && (
                    <span className="text-xs text-green-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> WhatsApp Alert Delivered!
                    </span>
                  )}
                </div>
              </div>
            )
          )}
        </div>

        {/* ─── 3. ALERT PREFERENCES & AUTOMATION RULES ─────────────────────── */}
        <div className="p-5 rounded-2xl bg-navy-950/70 border border-navy-800 space-y-3">
          <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5" /> Automation & Trigger Preferences
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-navy-900 border border-navy-800 cursor-pointer hover:border-navy-700 transition-all">
              <input
                type="checkbox"
                checked={alertOnHotScore}
                onChange={(e) => setAlertOnHotScore(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded accent-amber-500"
              />
              <div>
                <p className="text-xs font-semibold text-slate-200">Alert on Hot Lead (Score $\ge 75$)</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Send alerts automatically when AI qualifies a hot prospect.</p>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-navy-900 border border-navy-800 cursor-pointer hover:border-navy-700 transition-all">
              <input
                type="checkbox"
                checked={alertOnManualFlag}
                onChange={(e) => setAlertOnManualFlag(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded accent-amber-500"
              />
              <div>
                <p className="text-xs font-semibold text-slate-200">Alert on Manual Takeover</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Trigger handoff when a rep manually claims a lead from the dashboard.</p>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-navy-900 border border-navy-800 cursor-pointer hover:border-navy-700 transition-all">
              <input
                type="checkbox"
                checked={autoPauseOnHot}
                onChange={(e) => setAutoPauseOnHot(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded accent-amber-500"
              />
              <div>
                <p className="text-xs font-semibold text-slate-200">Auto-Pause Bot on Hot Lead</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Pause AI replies immediately so reps have full conversation control.</p>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-navy-900 border border-navy-800 cursor-pointer hover:border-navy-700 transition-all">
              <input
                type="checkbox"
                checked={forwardMessagesToRep}
                onChange={(e) => setForwardMessagesToRep(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded accent-amber-500"
              />
              <div>
                <p className="text-xs font-semibold text-slate-200">Forward Customer Messages</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Send subsequent lead messages to Telegram while bot is paused.</p>
              </div>
            </label>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-3.5 rounded-xl bg-navy-900/60 border border-navy-800 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Alert messages include the lead's name, source channel, qualification score, and AI summary.
          </span>
          <Button size="sm" onClick={handleSave} loading={saving} className="bg-amber-600 hover:bg-amber-500 text-white text-xs">
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
