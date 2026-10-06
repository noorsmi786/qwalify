import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  Shield,
  Scale,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Save,
  Loader2,
  Clock,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAgents } from '@/hooks/useAgents';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type CadencePreset = 'gentle' | 'balanced' | 'aggressive';

const PRESETS: {
  id: CadencePreset;
  label: string;
  emoji: string;
  icon: React.ElementType;
  description: string;
  pills: string[];
  color: string;
  selectedColor: string;
}[] = [
  {
    id: 'gentle',
    label: 'Gentle',
    emoji: '🕊️',
    icon: Shield,
    description: 'Low pressure. Gives leads plenty of space. Best for high-value or slow-moving purchases.',
    pills: ['Day 2', 'Day 5', 'Day 10', 'Day 20'],
    color: 'border-navy-600 bg-navy-800/40 hover:border-navy-500',
    selectedColor: 'border-teal-500/50 bg-teal-500/10',
  },
  {
    id: 'balanced',
    label: 'Balanced',
    emoji: '⚖️',
    icon: Scale,
    description: 'The sweet spot. Consistent without being pushy. Works for most businesses.',
    pills: ['6h', 'Day 1', 'Day 3', 'Day 7', 'Day 14'],
    color: 'border-navy-600 bg-navy-800/40 hover:border-navy-500',
    selectedColor: 'border-violet-500/50 bg-violet-500/10',
  },
  {
    id: 'aggressive',
    label: 'Aggressive',
    emoji: '⚡',
    icon: Zap,
    description: 'High frequency for fast-moving leads. Ideal for real estate, car sales, short-term offers.',
    pills: ['2h', 'Day 1', 'Day 2', 'Day 4', 'Day 7', 'Day 10'],
    color: 'border-navy-600 bg-navy-800/40 hover:border-navy-500',
    selectedColor: 'border-amber-500/50 bg-amber-500/10',
  },
];

const DELAY_OPTIONS = [
  { label: '30 minutes', value: '30m' },
  { label: '1 hour', value: '1h' },
  { label: '2 hours', value: '2h' },
  { label: '4 hours', value: '4h' },
  { label: '6 hours', value: '6h' },
  { label: '12 hours', value: '12h' },
  { label: '1 day', value: '1d' },
  { label: '2 days', value: '2d' },
  { label: '3 days', value: '3d' },
  { label: '5 days', value: '5d' },
  { label: '7 days', value: '7d' },
  { label: '10 days', value: '10d' },
  { label: '14 days', value: '14d' },
];

interface FollowupStep {
  id: string;
  delay: string;
  message: string;
}

export default function BotFollowupPage() {
  const { agents, updateAgent } = useAgents();
  const activeAgent = agents.find((a) => a.is_active) || agents[0];

  const [preset, setPreset] = useState<CadencePreset>('balanced');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [steps, setSteps] = useState<FollowupStep[]>([
    { id: '1', delay: '6h', message: 'Hi {name}! Just checking in — did you have any questions about {business}? I\'d love to help.' },
    { id: '2', delay: '1d', message: 'Hey {name}, still thinking it over? Happy to schedule a quick call if that helps. {booking_url}' },
    { id: '3', delay: '3d', message: 'Just a friendly nudge, {name}. Our team at {business} is ready whenever you are!' },
  ]);
  const [stopOnReply, setStopOnReply] = useState(true);
  const [stopOnBooking, setStopOnBooking] = useState(true);
  const [businessHoursOnly, setBusinessHoursOnly] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sync state when activeAgent loads
  useEffect(() => {
    if (activeAgent?.followup_cadence) {
      if (['gentle', 'balanced', 'aggressive'].includes(activeAgent.followup_cadence)) {
        setPreset(activeAgent.followup_cadence as CadencePreset);
      }
    }
  }, [activeAgent?.id]);

  const handleAddStep = () => {
    setSteps((prev) => [
      ...prev,
      { id: Date.now().toString(), delay: '1d', message: '' },
    ]);
  };

  const handleRemoveStep = (id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  };

  const handleUpdateStep = (id: string, field: 'delay' | 'message', value: string) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (activeAgent?.id) {
        await updateAgent(activeAgent.id, {
          followup_cadence: showAdvanced ? 'custom' : (preset as any),
          followup_config: {
            cadence: showAdvanced ? 'custom' : (preset as any),
            isCustom: showAdvanced,
            stopOnReply,
            stopOnBooking,
            onlyBusinessHours: businessHoursOnly,
            steps: steps.map((s) => ({
              id: s.id,
              delayHours: s.delay.includes('d') ? parseInt(s.delay) * 24 : parseInt(s.delay),
              delayLabel: s.delay,
              template: s.message,
            })),
          },
        });
      }
      toast.success('Follow-up rules saved successfully!');
    } catch {
      toast.error('Failed to save follow-up rules.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Follow-up Rules</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Choose how persistent your bot is when following up with leads who haven't responded.
        </p>
      </div>

      {/* Preset picker */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPreset(p.id)}
            className={cn(
              'p-4 rounded-xl border text-left transition-all space-y-3',
              preset === p.id ? p.selectedColor : p.color
            )}
          >
            <span className="text-2xl block">{p.emoji}</span>
            <div>
              <p className={cn(
                'text-sm font-semibold mb-1',
                preset === p.id ? 'text-slate-100' : 'text-slate-300'
              )}>{p.label}</p>
              <p className="text-xs text-slate-500 leading-relaxed">{p.description}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {p.pills.map((pill) => (
                <span
                  key={pill}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-navy-900/60 border border-navy-700 text-slate-400 font-mono"
                >
                  {pill}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>

      {/* Advanced toggle */}
      <div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {showAdvanced ? 'Hide custom sequence' : 'Customize follow-up sequence (advanced)'}
        </button>

        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 space-y-4 overflow-hidden"
            >
              <Card>
                <CardContent className="pt-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-200">Custom Sequence</p>
                    <Button variant="secondary" size="sm" onClick={handleAddStep}>
                      <Plus className="w-4 h-4" /> Add Step
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {steps.map((step, index) => (
                      <div key={step.id} className="p-4 rounded-xl bg-navy-800/40 border border-navy-700 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-xs font-bold text-violet-400">
                              {index + 1}
                            </span>
                            <p className="text-xs font-semibold text-slate-400">Message {index + 1}</p>
                          </div>
                          {steps.length > 1 && (
                            <button
                              onClick={() => handleRemoveStep(step.id)}
                              className="text-slate-600 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-slate-500 flex-shrink-0" />
                          <select
                            value={step.delay}
                            onChange={(e) => handleUpdateStep(step.id, 'delay', e.target.value)}
                            className="flex-1 bg-navy-900/80 border border-navy-600 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
                          >
                            {DELAY_OPTIONS.map((d) => (
                              <option key={d.value} value={d.value}>{d.label} after previous</option>
                            ))}
                          </select>
                        </div>

                        <textarea
                          value={step.message}
                          onChange={(e) => handleUpdateStep(step.id, 'message', e.target.value)}
                          placeholder="Type your follow-up message..."
                          rows={3}
                          className="w-full bg-navy-900/80 border border-navy-600 rounded-xl px-3 py-2.5 text-xs text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all leading-relaxed"
                        />
                        <p className="text-[10px] text-slate-600">
                          Use <code className="text-violet-400">{'{name}'}</code>, <code className="text-violet-400">{'{business}'}</code>, <code className="text-violet-400">{'{booking_url}'}</code> to personalize.
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Safety guardrails */}
              <Card>
                <CardContent className="pt-5 space-y-3">
                  <p className="text-sm font-semibold text-slate-200">Safety Rules</p>
                  {([
                    { key: 'stopOnReply', label: 'Stop follow-ups when the lead replies', value: stopOnReply, set: setStopOnReply },
                    { key: 'stopOnBooking', label: 'Stop follow-ups when a booking is made', value: stopOnBooking, set: setStopOnBooking },
                    { key: 'businessHoursOnly', label: 'Only send during business hours (9am–6pm)', value: businessHoursOnly, set: setBusinessHoursOnly },
                  ] as const).map(({ key, label, value, set }) => (
                    <label key={key} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => (set as (v: boolean) => void)(e.target.checked)}
                        className="w-4 h-4 rounded accent-violet-500"
                      />
                      <span className="text-sm text-slate-300">{label}</span>
                    </label>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} loading={saving} className="shadow-lg shadow-violet-600/20">
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
          ) : (
            <><Save className="w-4 h-4" /> Save Follow-up Rules</>
          )}
        </Button>
      </div>
    </div>
  );
}
