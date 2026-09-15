import { useState } from 'react';
import { formatDistanceToNow, format, isPast } from 'date-fns';
import {
  Clock,
  Pause,
  Play,
  SkipForward,
  Snowflake,
  Send,
  History,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useLeadFollowUpState } from '@/hooks/useFollowUpData';


// ─── Helpers ─────────────────────────────────────────────────────────────────

const PHASE_LABELS: Record<number, { label: string; color: string; icon: React.ReactNode }> = {
  1: { label: 'Phase 1 — Daily', color: 'text-violet-400', icon: <Send className="w-3.5 h-3.5" /> },
  2: { label: 'Phase 2 — Weekly', color: 'text-teal-400', icon: <Clock className="w-3.5 h-3.5" /> },
  3: { label: 'Cooled Off', color: 'text-slate-400', icon: <Snowflake className="w-3.5 h-3.5" /> },
};

const EVENT_STATUS_CONFIG = {
  sent:      { dot: 'bg-teal-400',    label: 'Sent' },
  failed:    { dot: 'bg-red-400',     label: 'Failed' },
  pending:   { dot: 'bg-amber-400',   label: 'Pending' },
  cancelled: { dot: 'bg-slate-500',   label: 'Cancelled' },
  skipped:   { dot: 'bg-slate-600',   label: 'Skipped' },
};

function CountdownBadge({ nextAt, paused }: { nextAt: string | null; paused: boolean }) {
  if (paused) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
        <Pause className="w-3 h-3" /> Paused
      </span>
    );
  }
  if (!nextAt) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 bg-slate-700/40 border border-slate-600/30 px-2.5 py-1 rounded-full">
        <Snowflake className="w-3 h-3" /> Sequence Complete
      </span>
    );
  }

  const isPastDue = isPast(new Date(nextAt));
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
        isPastDue
          ? 'text-red-400 bg-red-500/10 border-red-500/20'
          : 'text-teal-400 bg-teal-500/10 border-teal-500/20'
      }`}
    >
      <Clock className="w-3 h-3" />
      {isPastDue
        ? 'Overdue (processing soon)'
        : `Next in ${formatDistanceToNow(new Date(nextAt))}`}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface FollowUpStatusPanelProps {
  leadId: string;
  leadStatus: string;
}

export function FollowUpStatusPanel({ leadId, leadStatus }: FollowUpStatusPanelProps) {
  const { state, events, isLoading, pause, resume, enqueueNow, isPausing, isEnqueuing } =
    useLeadFollowUpState(leadId);

  const [showHistory, setShowHistory] = useState(false);

  // If lead is already booked / handed off, no follow-up needed
  if (['booked', 'cooled'].includes(leadStatus) && !state) return null;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-5">
          <div className="h-16 rounded-lg bg-navy-800/40 animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  const phase = PHASE_LABELS[state?.current_phase ?? 1];

  return (
    <Card className="border-navy-700/80">
      <CardHeader className="pb-3 border-b border-navy-700/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1.5 text-xs font-semibold ${phase.color}`}>
              {phase.icon}
              {phase.label}
            </span>
            {state && (
              <span className="text-[10px] text-slate-500 font-mono">
                · {state.attempt_number} sent total
              </span>
            )}
          </div>
          <CountdownBadge
            nextAt={state?.next_followup_at ?? null}
            paused={state?.paused ?? false}
          />
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Progress bar */}
        {state && state.current_phase !== 3 && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>
                {state.current_phase === 1
                  ? `Phase 1: ${state.phase1_sent} daily messages sent`
                  : `Phase 2: ${state.phase2_sent} weekly messages sent`}
              </span>
              <span>
                {state.current_phase === 1
                  ? `Day ${state.phase1_sent} of ~7`
                  : `Week ${state.phase2_sent} of ~8`}
              </span>
            </div>
            <div className="h-1.5 bg-navy-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  state.current_phase === 1
                    ? 'bg-gradient-to-r from-violet-600 to-violet-400'
                    : 'bg-gradient-to-r from-teal-600 to-teal-400'
                }`}
                style={{
                  width: `${
                    state.current_phase === 1
                      ? Math.min(100, (state.phase1_sent / 7) * 100)
                      : Math.min(100, (state.phase2_sent / 8) * 100)
                  }%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Cooled state */}
        {state?.current_phase === 3 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-700/20 border border-slate-700/40">
            <Snowflake className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-xs font-medium text-slate-300">Lead has cooled off</p>
              <p className="text-[10px] text-slate-500">
                Cooled {state.cooled_at ? formatDistanceToNow(new Date(state.cooled_at), { addSuffix: true }) : ''}. Re-enroll to restart outreach.
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {state?.paused ? (
            <Button size="sm" variant="secondary" onClick={() => resume()} loading={isPausing}>
              <Play className="w-3.5 h-3.5" /> Resume Sequence
            </Button>
          ) : state?.current_phase !== 3 ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => pause('Manually paused from Lead Detail')}
              loading={isPausing}
              className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
            >
              <Pause className="w-3.5 h-3.5" /> Pause
            </Button>
          ) : null}

          <Button
            size="sm"
            variant="outline"
            onClick={() => enqueueNow()}
            loading={isEnqueuing}
          >
            <SkipForward className="w-3.5 h-3.5" /> Re-Enroll
          </Button>

          {events.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowHistory((v) => !v)}
              className="text-xs text-slate-400 ml-auto"
            >
              <History className="w-3.5 h-3.5" />
              {showHistory ? 'Hide' : 'History'} ({events.length})
            </Button>
          )}
        </div>

        {/* Event History */}
        <AnimatePresence>
          {showHistory && events.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="border-t border-navy-700/60 pt-3 space-y-2">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Follow-Up History
                </p>
                {events.map((ev) => {
                  const cfg = EVENT_STATUS_CONFIG[ev.status] ?? EVENT_STATUS_CONFIG.pending;
                  return (
                    <div
                      key={ev.id}
                      className="flex items-center justify-between text-xs py-1.5 border-b border-navy-800/60 last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                        <span className="text-slate-400">
                          Attempt #{ev.attempt_number} ·{' '}
                          <span className="font-medium">
                            Phase {ev.phase === 1 ? 'Daily' : 'Weekly'}
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-right flex-shrink-0">
                        <span className={`font-medium ${ev.status === 'sent' ? 'text-teal-400' : ev.status === 'failed' ? 'text-red-400' : 'text-slate-400'}`}>
                          {cfg.label}
                        </span>
                        <span className="text-slate-600 font-mono text-[10px]">
                          {ev.sent_at
                            ? format(new Date(ev.sent_at), 'MMM d, HH:mm')
                            : format(new Date(ev.scheduled_for), 'MMM d, HH:mm')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
