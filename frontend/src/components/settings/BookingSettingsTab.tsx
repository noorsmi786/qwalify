import { useState, useEffect } from 'react';
import {
  Calendar,
  Link2,
  Clock,
  Zap,
  Save,
  ExternalLink,
  ToggleLeft,
  ToggleRight,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useBookingSettings } from '@/hooks/useBookingData';
import type { BookingSettings } from '@/hooks/useBookingData';

// ─── Provider meta ────────────────────────────────────────────────────────────

const BOOKING_PROVIDERS = [
  {
    id: 'calendly',
    name: 'Calendly',
    description: 'Most popular scheduling tool with free tier',
    icon: '📅',
    placeholder: 'https://calendly.com/yourname/intro-call',
    guideUrl: 'https://calendly.com',
    guideSteps: [
      'Sign up at calendly.com (free tier available).',
      'Create an Event Type (e.g., "30-min Intro Call").',
      'Copy the share link from your event and paste it below.',
    ],
    isFree: true,
  },
  {
    id: 'cal_com',
    name: 'Cal.com',
    description: 'Open-source Calendly alternative, fully free',
    icon: '🗓️',
    placeholder: 'https://cal.com/yourname/intro-call',
    guideUrl: 'https://cal.com',
    guideSteps: [
      'Sign up at cal.com (completely free and open-source).',
      'Create an Event Type and copy its share link.',
      'Paste it below.',
    ],
    isFree: true,
  },
  {
    id: 'link',
    name: 'Custom Link',
    description: 'Any booking URL — Google Calendar, TidyCal, HubSpot, etc.',
    icon: '🔗',
    placeholder: 'https://meet.example.com/book',
    guideUrl: '',
    guideSteps: ['Paste any booking or meeting link where leads can schedule a time with you.'],
    isFree: false,
  },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export function BookingSettingsTab() {
  const { settings, isLoading, saveSettings, isSaving } = useBookingSettings();
  const [draft, setDraft] = useState<BookingSettings | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>('calendly');

  useEffect(() => {
    if (settings && !draft) {
      setDraft(settings);
      setSelectedProvider(settings.booking_type);
    }
  }, [settings]);

  const set = (patch: Partial<BookingSettings>) =>
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));

  const activeMeta = BOOKING_PROVIDERS.find((p) => p.id === selectedProvider);

  if (isLoading || !draft) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-navy-800/50 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">Appointment Booking</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            When a lead hits hot score, the AI automatically sends your booking link to schedule a call.
          </p>
        </div>
        <Button size="sm" onClick={() => saveSettings(draft!)} loading={isSaving}>
          <Save className="w-3.5 h-3.5" /> Save Settings
        </Button>
      </div>

      {/* Auto-send toggle */}
      <div className="flex items-center justify-between p-4 rounded-xl border border-navy-700 bg-navy-800/40">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg border ${draft.auto_send_on_handoff ? 'bg-teal-500/10 border-teal-500/30 text-teal-400' : 'bg-navy-700 border-navy-600 text-slate-500'}`}>
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-200">Auto-Send on Hot Score</p>
            <p className="text-xs text-slate-500">
              When a lead reaches score ≥ <strong className="text-slate-400">{draft.hot_score_threshold}</strong>, AI automatically includes your booking link in its reply.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => set({ auto_send_on_handoff: !draft.auto_send_on_handoff })}
          className={`text-2xl transition-colors ${draft.auto_send_on_handoff ? 'text-teal-400' : 'text-slate-600'}`}
        >
          {draft.auto_send_on_handoff
            ? <ToggleRight className="w-8 h-8" />
            : <ToggleLeft className="w-8 h-8" />}
        </button>
      </div>

      {/* Hot Score Threshold */}
      <Card>
        <CardHeader className="pb-3">
          <p className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-red-400" /> Hot Score Threshold
          </p>
          <p className="text-xs text-slate-400">Booking link is sent when lead score reaches this value</p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={50}
              max={95}
              value={draft.hot_score_threshold}
              onChange={(e) => set({ hot_score_threshold: Number(e.target.value) })}
              className="flex-1 accent-red-500"
            />
            <span className="text-base font-mono font-bold text-red-400 w-16 text-right">
              {draft.hot_score_threshold}+
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Provider Selection */}
      <Card>
        <CardHeader className="pb-3">
          <p className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-violet-400" /> Booking Provider
          </p>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {/* Provider picker */}
          <div className="grid grid-cols-3 gap-2">
            {BOOKING_PROVIDERS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setSelectedProvider(p.id);
                  set({ booking_type: p.id as BookingSettings['booking_type'] });
                }}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selectedProvider === p.id
                    ? 'border-violet-500/50 bg-violet-500/10'
                    : 'border-navy-700 bg-navy-800/40 hover:border-navy-600'
                }`}
              >
                <div className="text-xl mb-1">{p.icon}</div>
                <p className="text-xs font-semibold text-slate-200">{p.name}</p>
                {p.isFree && (
                  <span className="text-[9px] text-teal-400 font-medium">⚡ Free</span>
                )}
              </button>
            ))}
          </div>

          {/* Setup guide */}
          {activeMeta && activeMeta.guideSteps.length > 0 && (
            <div className="p-3 rounded-lg bg-violet-500/5 border border-violet-500/10 text-xs space-y-1">
              <p className="font-medium text-violet-300">How to get your booking link:</p>
              <ol className="list-decimal list-inside space-y-1 text-slate-400 pl-1">
                {activeMeta.guideSteps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
              {activeMeta.guideUrl && (
                <a
                  href={activeMeta.guideUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-violet-400 hover:text-violet-300 underline font-medium mt-1"
                >
                  Open {activeMeta.name} <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}

          {/* Booking URL input */}
          <Input
            label="Booking URL"
            placeholder={activeMeta?.placeholder || 'https://your-booking-link.com'}
            value={draft.booking_url}
            onChange={(e) => set({ booking_url: e.target.value })}
            icon={<Link2 className="w-4 h-4" />}
          />

          {/* Meeting duration */}
          <div>
            <label className="text-xs font-medium text-slate-300 mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" /> Default Meeting Duration
            </label>
            <div className="flex gap-2">
              {[15, 30, 45, 60].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => set({ meeting_duration_mins: d })}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    draft.meeting_duration_mins === d
                      ? 'bg-violet-600/20 border-violet-500/40 text-violet-300'
                      : 'bg-navy-800 border-navy-700 text-slate-400 hover:border-navy-600'
                  }`}
                >
                  {d} min
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation message template */}
      <Card>
        <CardHeader className="pb-3">
          <p className="text-sm font-semibold text-slate-200">Booking Confirmation Message</p>
          <p className="text-xs text-slate-400 mt-0.5">
            Sent by the AI when proposing a booking. Include <code className="text-violet-400">{'{{booking_url}}'}</code> to insert your link.
          </p>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          <textarea
            rows={4}
            value={draft.confirmation_message}
            onChange={(e) => set({ confirmation_message: e.target.value })}
            className="w-full bg-navy-900/80 border border-navy-600 rounded-lg px-3 py-2.5 text-xs text-slate-200 font-mono resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/50 leading-relaxed"
          />
          <p className="text-[10px] text-slate-600">
            Variables: <code className="text-violet-400">{'{{booking_url}}'}</code>,{' '}
            <code className="text-violet-400">{'{{lead_name}}'}</code>,{' '}
            <code className="text-violet-400">{'{{company_name}}'}</code>
          </p>
        </CardContent>
      </Card>

      {/* Info note */}
      <div className="flex gap-2 p-3 rounded-lg bg-navy-900/60 border border-navy-700/60 text-xs text-slate-500">
        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          The booking link is also available as a manual action in Lead Detail — reps can send it anytime with one click, regardless of the lead's score.
        </p>
      </div>
    </div>
  );
}
