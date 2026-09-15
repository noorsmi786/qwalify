import { useState } from 'react';
import { format, isPast, formatDistanceToNow } from 'date-fns';
import {
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Video,
  Sparkles,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ChannelBadge } from '@/components/ui/Badge';
import { LeadAvatar } from '@/components/leads/LeadAvatar';
import { useBookings } from '@/hooks/useBookingData';
import { useNavigate } from 'react-router-dom';
import type { ChannelType } from '@/types';

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  confirmed:   { label: 'Confirmed',   dot: 'bg-teal-400',   text: 'text-teal-400',   bg: 'bg-teal-500/10 border-teal-500/20' },
  completed:   { label: 'Completed',   dot: 'bg-slate-400',  text: 'text-slate-400',  bg: 'bg-slate-700/30 border-slate-600/30' },
  cancelled:   { label: 'Cancelled',   dot: 'bg-red-400',    text: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20' },
  rescheduled: { label: 'Rescheduled', dot: 'bg-amber-400',  text: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/20' },
};

type FilterStatus = 'all' | 'confirmed' | 'completed' | 'cancelled';

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BookingsPage() {
  const { data: bookings = [], isLoading } = useBookings();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterStatus>('all');

  const filtered = bookings.filter((b) => filter === 'all' || b.status === filter);
  const upcoming = bookings.filter((b) => b.status === 'confirmed' && !isPast(new Date(b.scheduled_at)));
  const completed = bookings.filter((b) => b.status === 'completed');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-violet-400" /> Appointments
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Booked demos and intro calls from qualified leads
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/settings')}
          className="text-xs"
        >
          <Sparkles className="w-3.5 h-3.5" /> Configure Booking Link
        </Button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Upcoming', value: upcoming.length, color: 'text-teal-400', icon: <Clock className="w-4 h-4" /> },
          { label: 'Total Booked', value: bookings.filter((b) => b.status !== 'cancelled').length, color: 'text-violet-400', icon: <Calendar className="w-4 h-4" /> },
          { label: 'Completed', value: completed.length, color: 'text-slate-300', icon: <CheckCircle2 className="w-4 h-4" /> },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="py-4 flex items-center gap-3">
              <div className={`${stat.color} opacity-70`}>{stat.icon}</div>
              <div>
                <p className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-navy-800/60 border border-navy-700 w-fit">
        {(['all', 'confirmed', 'completed', 'cancelled'] as FilterStatus[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
              filter === f
                ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Bookings list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-navy-800/40 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
            <Calendar className="w-10 h-10 text-slate-700" />
            <p className="text-sm font-medium text-slate-400">No bookings found</p>
            <p className="text-xs text-slate-600 max-w-xs">
              When a lead's score hits hot and the AI sends a booking link, confirmed appointments will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((booking, i) => {
            const status = STATUS_CONFIG[booking.status];
            const scheduledDate = new Date(booking.scheduled_at);
            const isUpcoming = !isPast(scheduledDate) && booking.status === 'confirmed';

            return (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card className={`transition-all hover:border-navy-600 ${isUpcoming ? 'border-teal-500/20' : ''}`}>
                  <CardContent className="py-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      {/* Lead info */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <LeadAvatar name={booking.lead?.full_name || '?'} size="md" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-slate-100 truncate">
                              {booking.lead?.full_name || 'Unknown Lead'}
                            </p>
                            {booking.lead?.source_channel && (
                              <ChannelBadge
                                channel={booking.lead.source_channel as ChannelType}
                                showLabel={false}
                              />
                            )}
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${status.bg} ${status.text}`}
                            >
                              {status.label}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 truncate mt-0.5">
                            {booking.lead?.contact}
                          </p>
                        </div>
                      </div>

                      {/* Date/time */}
                      <div className="flex flex-col items-start sm:items-end gap-0.5 flex-shrink-0">
                        <p className="text-sm font-semibold text-slate-200">
                          {format(scheduledDate, 'MMM d, yyyy')}
                        </p>
                        <p className="text-xs text-slate-400">
                          {format(scheduledDate, 'h:mm a')} · {booking.duration_mins} min
                        </p>
                        {isUpcoming && (
                          <p className="text-[10px] text-teal-400 font-medium">
                            In {formatDistanceToNow(scheduledDate)}
                          </p>
                        )}
                        {!isUpcoming && booking.status === 'completed' && (
                          <p className="text-[10px] text-slate-500">
                            {formatDistanceToNow(scheduledDate, { addSuffix: true })}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {booking.meeting_url && (
                          <a
                            href={booking.meeting_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/15 border border-violet-500/30 text-xs font-medium text-violet-300 hover:bg-violet-600/25 transition-all"
                          >
                            <Video className="w-3.5 h-3.5" /> Join
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => navigate(`/leads/${booking.lead_id}`)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-navy-700 transition-all"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {booking.notes && (
                      <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-navy-700/60 italic">
                        "{booking.notes}"
                      </p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
