import { useState, useEffect } from 'react';
import {
  Clock,
  Play,
  Snowflake,
  RotateCcw,
  Save,
  Zap,
  ChevronRight,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useFollowUpSequence } from '@/hooks/useFollowUpData';
import type { FollowUpSequence } from '@/hooks/useFollowUpData';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysLabel(n: number) {
  return n === 1 ? '1 day' : `${n} days`;
}

function weeksLabel(n: number) {
  return n === 1 ? '1 week' : `${n} weeks`;
}

function TemplateEditor({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-slate-300">{label}</label>
        {hint && <span className="text-[10px] text-slate-500">{hint}</span>}
      </div>
      <textarea
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-navy-900/80 border border-navy-600 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 font-mono resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/50 leading-relaxed"
      />
      <p className="text-[10px] text-slate-600 leading-snug">
        Variables: <code className="text-violet-400">{'{{lead_name}}'}</code>,{' '}
        <code className="text-violet-400">{'{{company_name}}'}</code>
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CadenceSettingsTab() {
  const { sequence, isLoading, updateSequence, isSaving } = useFollowUpSequence();

  // Local draft state — edits don't hit DB until Save is clicked
  const [draft, setDraft] = useState<FollowUpSequence | null>(null);

  useEffect(() => {
    if (sequence && !draft) setDraft(sequence);
  }, [sequence]);

  const set = (patch: Partial<FollowUpSequence>) =>
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));

  const handleSave = () => {
    if (!draft) return;
    updateSequence({
      name:                    draft.name,
      phase1_days:             draft.phase1_days,
      phase1_interval:         `${draft.phase1_days === 1 ? '1 day' : `${draft.phase1_days} days`}`,
      phase2_weeks:            draft.phase2_weeks,
      phase2_interval:         `${draft.phase2_weeks * 7} days`,
      cool_after_days:         draft.phase1_days + draft.phase2_weeks * 7,
      is_active:               draft.is_active,
      phase1_message_template: draft.phase1_message_template,
      phase2_message_template: draft.phase2_message_template,
      cool_message_template:   draft.cool_message_template,
    });
  };

  const handleReset = () => setDraft(sequence ?? null);

  if (isLoading || !draft) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-navy-800/60 animate-pulse" />
        ))}
      </div>
    );
  }

  const totalDays = draft.phase1_days + draft.phase2_weeks * 7;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">Follow-Up Cadence</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Controls what happens when a lead goes unresponsive after AI qualification.
            Total campaign duration:{' '}
            <span className="text-violet-400 font-medium">{totalDays} days</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs">
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </Button>
          <Button size="sm" onClick={handleSave} loading={isSaving}>
            <Save className="w-3.5 h-3.5" /> Save Cadence
          </Button>
        </div>
      </div>

      {/* Enable / Disable toggle */}
      <div className="flex items-center justify-between p-4 rounded-xl border border-navy-700 bg-navy-800/40">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg border ${draft.is_active ? 'bg-teal-500/10 border-teal-500/30 text-teal-400' : 'bg-navy-700 border-navy-600 text-slate-500'}`}>
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-200">Sequence Engine</p>
            <p className="text-xs text-slate-500">
              {draft.is_active
                ? 'Auto follow-up is active — unresponsive leads enter this sequence.'
                : 'Disabled — no automated follow-ups will be sent.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => set({ is_active: !draft.is_active })}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            draft.is_active ? 'bg-teal-500' : 'bg-navy-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
              draft.is_active ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Visual Timeline */}
      <div className="relative">
        {/* Connector line */}
        <div className="absolute left-6 top-8 bottom-8 w-px bg-gradient-to-b from-violet-500/40 via-teal-500/30 to-slate-600/20 z-0" />

        <div className="space-y-3">
          {/* Phase 1: Daily */}
          <Card className="border-violet-500/20 bg-navy-800/60 relative z-10">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
                  <Play className="w-4 h-4 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <p className="text-sm font-semibold text-slate-200">Phase 1 — Daily Follow-Ups</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Starts immediately after a lead goes silent. One message every day.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-slate-400">Duration:</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => set({ phase1_days: Math.max(1, draft.phase1_days - 1) })}
                          className="w-7 h-7 rounded-lg bg-navy-700 border border-navy-600 text-slate-300 hover:bg-navy-600 text-base leading-none flex items-center justify-center"
                        >
                          −
                        </button>
                        <span className="text-sm font-mono font-bold text-violet-400 w-16 text-center">
                          {daysLabel(draft.phase1_days)}
                        </span>
                        <button
                          type="button"
                          onClick={() => set({ phase1_days: Math.min(30, draft.phase1_days + 1) })}
                          className="w-7 h-7 rounded-lg bg-navy-700 border border-navy-600 text-slate-300 hover:bg-navy-600 text-base leading-none flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <TemplateEditor
                label="Message Template (Phase 1)"
                hint={`Sent once daily for ${daysLabel(draft.phase1_days)}`}
                value={draft.phase1_message_template}
                onChange={(v) => set({ phase1_message_template: v })}
              />
            </CardContent>
          </Card>

          {/* Arrow / connector */}
          <div className="flex items-center gap-2 pl-3">
            <ChevronRight className="w-4 h-4 text-slate-600 rotate-90" />
            <span className="text-[10px] text-slate-600">
              After {daysLabel(draft.phase1_days)}, frequency drops to weekly
            </span>
          </div>

          {/* Phase 2: Weekly */}
          <Card className="border-teal-500/20 bg-navy-800/60 relative z-10">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-teal-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <p className="text-sm font-semibold text-slate-200">Phase 2 — Weekly Follow-Ups</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Lower-frequency nurture. One message per week for the defined period.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-slate-400">Duration:</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => set({ phase2_weeks: Math.max(1, draft.phase2_weeks - 1) })}
                          className="w-7 h-7 rounded-lg bg-navy-700 border border-navy-600 text-slate-300 hover:bg-navy-600 text-base leading-none flex items-center justify-center"
                        >
                          −
                        </button>
                        <span className="text-sm font-mono font-bold text-teal-400 w-16 text-center">
                          {weeksLabel(draft.phase2_weeks)}
                        </span>
                        <button
                          type="button"
                          onClick={() => set({ phase2_weeks: Math.min(24, draft.phase2_weeks + 1) })}
                          className="w-7 h-7 rounded-lg bg-navy-700 border border-navy-600 text-slate-300 hover:bg-navy-600 text-base leading-none flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <TemplateEditor
                label="Message Template (Phase 2)"
                hint={`Sent weekly for ${weeksLabel(draft.phase2_weeks)}`}
                value={draft.phase2_message_template}
                onChange={(v) => set({ phase2_message_template: v })}
              />
            </CardContent>
          </Card>

          {/* Arrow / connector */}
          <div className="flex items-center gap-2 pl-3">
            <ChevronRight className="w-4 h-4 text-slate-600 rotate-90" />
            <span className="text-[10px] text-slate-600">
              After {weeksLabel(draft.phase2_weeks)}, send final goodbye and cool the lead
            </span>
          </div>

          {/* Phase 3: Cool */}
          <Card className="border-slate-700/60 bg-navy-800/40 relative z-10">
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-700/30 border border-slate-600/40 flex items-center justify-center flex-shrink-0">
                  <Snowflake className="w-4 h-4 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-300">Phase 3 — Cooling Off</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Triggered at day <strong className="text-slate-400">{totalDays}</strong>. A final farewell message is sent and the lead is marked <code className="text-xs bg-navy-700 px-1 py-0.5 rounded text-slate-300">cooled</code>.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <TemplateEditor
                label="Cooling Message Template"
                hint="Sent once, then no more outreach"
                value={draft.cool_message_template}
                onChange={(v) => set({ cool_message_template: v })}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Info note */}
      <div className="flex gap-2 p-3 rounded-lg bg-navy-900/60 border border-navy-700/60 text-xs text-slate-500">
        <Info className="w-3.5 h-3.5 text-slate-600 flex-shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          The sequence pauses automatically when a lead replies, gets handed off, or books an appointment.
          You can also manually pause any individual lead from their Lead Detail page.
          This cadence applies to all unresponsive leads unless overridden per-lead.
        </p>
      </div>
    </div>
  );
}
