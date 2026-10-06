import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Smile, ChevronDown, ChevronUp, Save, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAgents } from '@/hooks/useAgents';
import type { ToneType } from '@/types/agent';
import { toast } from 'sonner';

const TONE_OPTIONS: {
  id: ToneType;
  label: string;
  emoji: string;
  description: string;
}[] = [
  {
    id: 'professional',
    label: 'Professional',
    emoji: '👔',
    description: 'Formal, precise, business-like. Great for B2B, finance, legal, or enterprise clients.',
  },
  {
    id: 'friendly',
    label: 'Friendly',
    emoji: '😊',
    description: 'Warm and approachable, but still on-topic. Works for most industries.',
  },
  {
    id: 'casual',
    label: 'Casual',
    emoji: '😎',
    description: 'Relaxed and conversational. Great for lifestyle brands, hair salons, and local businesses.',
  },
];

export default function BotPersonalityPage() {
  const { agents, isLoading, updateAgent, createAgent } = useAgents();
  const activeAgent = agents.find((a) => a.is_active) || agents[0];

  const [tone, setTone] = useState<ToneType>('friendly');
  const [description, setDescription] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // Sync state when activeAgent loads
  useEffect(() => {
    if (activeAgent) {
      setTone(activeAgent.tone || 'friendly');
      setDescription(activeAgent.business_description || '');
      setSystemPrompt(activeAgent.custom_system_prompt || '');
    }
  }, [activeAgent?.id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (activeAgent?.id) {
        await updateAgent(activeAgent.id, {
          tone,
          business_description: description.trim(),
          custom_system_prompt: systemPrompt.trim(),
        });
      } else {
        await createAgent({
          industry: 'custom',
          tone,
          business_description: description.trim(),
          custom_system_prompt: systemPrompt.trim(),
          is_active: true,
        });
      }
      toast.success('Bot personality & prompt saved successfully!');
    } catch {
      toast.error('Failed to save personality. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-navy-700 rounded w-48" />
          <div className="h-4 bg-navy-700 rounded w-72" />
          <div className="h-40 bg-navy-700 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Personality & Tone</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Choose how your bot talks to leads. No technical knowledge needed.
        </p>
      </div>

      {/* Tone picker */}
      <Card>
        <CardContent className="pt-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Smile className="w-4 h-4 text-violet-400" />
            <p className="text-sm font-semibold text-slate-200">How should your bot sound?</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {TONE_OPTIONS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTone(t.id)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  tone === t.id
                    ? 'border-violet-500/50 bg-violet-600/10 shadow-[0_0_20px_rgba(124,58,237,0.12)]'
                    : 'border-navy-600 bg-navy-800/40 hover:border-navy-500 hover:bg-navy-800/70'
                }`}
              >
                <span className="text-2xl block mb-2">{t.emoji}</span>
                <p className={`text-sm font-semibold mb-1 ${
                  tone === t.id ? 'text-violet-300' : 'text-slate-200'
                }`}>{t.label}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{t.description}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Plain-language description */}
      <Card>
        <CardContent className="pt-5 space-y-3">
          <div>
            <p className="text-sm font-semibold text-slate-200">Describe your bot in plain language</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Tell us about your business and how you want the bot to behave. No technical terms needed.
            </p>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. I run a dental clinic. My bot should greet patients warmly, ask about their dental concern, and offer to book an appointment. It should never discuss prices."
            rows={5}
            className="w-full bg-navy-900/80 border border-navy-600 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all leading-relaxed"
          />
        </CardContent>
      </Card>

      {/* Advanced toggle */}
      <div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {showAdvanced ? 'Hide advanced settings' : 'Edit advanced prompt (optional)'}
        </button>

        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3"
          >
            <Card>
              <CardContent className="pt-5 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-slate-200">Raw System Prompt</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    For power users only. This overrides the description above.
                  </p>
                </div>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="You are a helpful AI assistant for..."
                  rows={8}
                  className="w-full bg-navy-900/80 border border-navy-600 rounded-xl px-4 py-3 text-xs font-mono text-slate-300 placeholder-slate-600 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all leading-relaxed"
                />
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} loading={saving} className="shadow-lg shadow-violet-600/20">
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
          ) : (
            <><Save className="w-4 h-4" /> Save Personality</>
          )}
        </Button>
      </div>
    </div>
  );
}
