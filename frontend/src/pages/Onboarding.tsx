import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Building2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Zap,
  Key,
  MessageSquare,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, CardContent } from '@/components/ui/Card';
import { useAuthStore } from '@/store/authStore';
import { useAIConfig } from '@/hooks/useAIConfig';
import { AI_PROVIDERS_LIST } from '@/lib/ai/providersMeta';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { toast } from 'sonner';
import type { AIProviderId } from '@/lib/ai/types';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { tenant, updateTenantInfo } = useAuthStore();
  const { saveConfig, setAsActive } = useAIConfig();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isFinishing, setIsFinishing] = useState(false);

  // Step 1: Workspace
  const [workspaceName, setWorkspaceName] = useState(tenant?.name || '');
  const [timezone, setTimezone] = useState(tenant?.timezone || 'America/New_York');

  // Step 2: AI Provider
  const [selectedAI, setSelectedAI] = useState<AIProviderId>('gemini');
  const [aiKey, setAiKey] = useState('');

  // Step 3: Primary Channel
  const [channelType, setChannelType] = useState<'whatsapp' | 'telegram'>('whatsapp');
  const [evolutionUrl, setEvolutionUrl] = useState('https://wa.qwalify.online');
  const [evolutionKey, setEvolutionKey] = useState('');
  const [telegramToken, setTelegramToken] = useState('');

  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName.trim()) {
      toast.error('Please enter a workspace name');
      return;
    }
    setStep(2);
  };

  const handleNextStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(3);
  };

  const handleFinishOnboarding = async () => {
    setIsFinishing(true);
    try {
      // 1. Update workspace details & mark onboarding complete
      await updateTenantInfo({ name: workspaceName, timezone });

      if (isSupabaseConfigured && tenant?.id) {
        await supabase
          .from('tenants')
          .update({ onboarding_completed: true })
          .eq('id', tenant.id);

        // 2. Save AI Provider
        if (aiKey.trim()) {
          const providerMeta = AI_PROVIDERS_LIST.find((p) => p.id === selectedAI);
          await saveConfig({
            provider: selectedAI,
            model: providerMeta?.defaultModel || '',
            api_key: aiKey.trim(),
            is_active: true,
          });
          setAsActive(selectedAI);
        }

        // 3. Save Channel credentials
        if (channelType === 'whatsapp' && evolutionKey.trim()) {
          await supabase.from('channel_connections').upsert({
            tenant_id: tenant.id,
            channel: 'whatsapp',
            status: 'connected',
            config: { api_url: evolutionUrl, api_key: evolutionKey, instance_name: 'default' },
            connected_at: new Date().toISOString(),
          }, { onConflict: 'tenant_id, channel' });
        } else if (channelType === 'telegram' && telegramToken.trim()) {
          await supabase.from('channel_connections').upsert({
            tenant_id: tenant.id,
            channel: 'telegram',
            status: 'connected',
            config: { bot_token: telegramToken },
            connected_at: new Date().toISOString(),
          }, { onConflict: 'tenant_id, channel' });
        }
      }

      toast.success('Workspace is ready! Welcome to Qwalify 🎉');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to complete setup.');
    } finally {
      setIsFinishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-xl space-y-6 relative z-10">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-600/10 border border-violet-500/20 text-xs font-semibold text-violet-300">
            <Zap className="w-3.5 h-3.5 text-violet-400" /> Fast-Track Onboarding
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Configure Your AI Lead Engine
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Set up your workspace, pick your AI model, and connect your messaging channel in 60 seconds.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between px-6">
          {[
            { num: 1, label: 'Workspace', icon: Building2 },
            { num: 2, label: 'AI Engine', icon: Sparkles },
            { num: 3, label: 'Channel', icon: MessageSquare },
          ].map((s, idx) => (
            <div key={s.num} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step === s.num
                    ? 'bg-violet-600 text-white ring-4 ring-violet-600/20'
                    : step > s.num
                    ? 'bg-teal-500 text-white'
                    : 'bg-navy-800 text-slate-500 border border-navy-700'
                }`}
              >
                {step > s.num ? <CheckCircle2 className="w-4 h-4" /> : s.num}
              </div>
              <span className={`text-xs font-medium hidden sm:inline ${step >= s.num ? 'text-slate-200' : 'text-slate-500'}`}>
                {s.label}
              </span>
              {idx < 2 && <div className="w-8 sm:w-12 h-px bg-navy-700 mx-1" />}
            </div>
          ))}
        </div>

        {/* Wizard Card */}
        <Card className="border-navy-700/80 bg-navy-900/90 shadow-2xl backdrop-blur-xl">
          <CardContent className="p-6">
            <AnimatePresence mode="wait">
              {/* Step 1: Workspace */}
              {step === 1 && (
                <motion.form
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleNextStep1}
                  className="space-y-4"
                >
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-violet-400" /> Name Your Workspace
                    </h3>
                    <p className="text-xs text-slate-400">
                      This represents your company or brand name that the AI uses when greeting prospects.
                    </p>
                  </div>

                  <Input
                    label="Company / Workspace Name"
                    placeholder="e.g. Apex Digital or Acme Corp"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    required
                    autoFocus
                  />

                  <Select
                    label="Operating Timezone"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                  >
                    <option value="America/New_York">America/New_York (EST)</option>
                    <option value="America/Chicago">America/Chicago (CST)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                    <option value="Europe/Paris">Europe/Paris (CET)</option>
                    <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                    <option value="Asia/Karachi">Asia/Karachi (PKT)</option>
                    <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                    <option value="UTC">UTC (Universal)</option>
                  </Select>

                  <div className="flex justify-end pt-3">
                    <Button size="md" type="submit">
                      Continue to AI Engine <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </motion.form>
              )}

              {/* Step 2: AI Engine */}
              {step === 2 && (
                <motion.form
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onSubmit={handleNextStep2}
                  className="space-y-4"
                >
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-violet-400" /> Choose Your AI Provider
                    </h3>
                    <p className="text-xs text-slate-400">
                      Bring your own API key. You can switch models anytime in Settings.
                    </p>
                  </div>

                  {/* Provider grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {AI_PROVIDERS_LIST.slice(0, 4).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedAI(p.id as AIProviderId)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          selectedAI === p.id
                            ? 'border-violet-500 bg-violet-500/10 shadow-[0_0_15px_rgba(124,58,237,0.15)]'
                            : 'border-navy-700 bg-navy-800/40 hover:border-navy-600'
                        }`}
                      >
                        <p className="text-xs font-semibold text-slate-200">{p.name}</p>
                        {p.badge && (
                          <span className="text-[9px] text-teal-300 font-medium block mt-1">
                            {p.badge.replace('⚡ ', '')}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  <Input
                    label="API Key"
                    type="password"
                    placeholder={`Paste your ${selectedAI} API key`}
                    value={aiKey}
                    onChange={(e) => setAiKey(e.target.value)}
                    icon={<Key className="w-4 h-4" />}
                  />

                  <p className="text-[11px] text-slate-500">
                    💡 Don't have a key right now? You can skip and use the mock simulator until you add one.
                  </p>

                  <div className="flex justify-between pt-3">
                    <Button variant="ghost" size="md" type="button" onClick={() => setStep(1)}>
                      <ArrowLeft className="w-4 h-4 mr-1" /> Back
                    </Button>
                    <Button size="md" type="submit">
                      Next: Channel <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </motion.form>
              )}

              {/* Step 3: Messaging Channel */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-violet-400" /> Connect Primary Channel
                    </h3>
                    <p className="text-xs text-slate-400">
                      Where will incoming leads contact you?
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setChannelType('whatsapp')}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        channelType === 'whatsapp'
                          ? 'border-green-500 bg-green-500/10'
                          : 'border-navy-700 bg-navy-800/40'
                      }`}
                    >
                      <div className="text-2xl mb-1">💬</div>
                      <p className="text-xs font-semibold text-slate-200">WhatsApp</p>
                      <p className="text-[10px] text-slate-500">Evolution API</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setChannelType('telegram')}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        channelType === 'telegram'
                          ? 'border-sky-500 bg-sky-500/10'
                          : 'border-navy-700 bg-navy-800/40'
                      }`}
                    >
                      <div className="text-2xl mb-1">✈️</div>
                      <p className="text-xs font-semibold text-slate-200">Telegram Bot</p>
                      <p className="text-[10px] text-slate-500">BotFather Token</p>
                    </button>
                  </div>

                  {channelType === 'whatsapp' ? (
                    <div className="space-y-3 pt-2">
                      <Input
                        label="Evolution API URL"
                        placeholder="https://wa.yourdomain.com"
                        value={evolutionUrl}
                        onChange={(e) => setEvolutionUrl(e.target.value)}
                      />
                      <Input
                        label="API Key"
                        type="password"
                        placeholder="Evolution API Global Key"
                        value={evolutionKey}
                        onChange={(e) => setEvolutionKey(e.target.value)}
                      />
                    </div>
                  ) : (
                    <div className="space-y-3 pt-2">
                      <Input
                        label="Telegram Bot Token"
                        type="password"
                        placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                        value={telegramToken}
                        onChange={(e) => setTelegramToken(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="flex justify-between pt-3">
                    <Button variant="ghost" size="md" type="button" onClick={() => setStep(2)}>
                      <ArrowLeft className="w-4 h-4 mr-1" /> Back
                    </Button>
                    <Button size="md" onClick={handleFinishOnboarding} loading={isFinishing}>
                      Launch Workspace <RocketIcon className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function RocketIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}
