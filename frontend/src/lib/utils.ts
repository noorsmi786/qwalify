import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow, format, parseISO } from 'date-fns';
import type { LeadStatus, ChannelType } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(dateString: string): string {
  return formatDistanceToNow(parseISO(dateString), { addSuffix: true });
}

export function formatDate(dateString: string, fmt = 'MMM d, yyyy'): string {
  return format(parseISO(dateString), fmt);
}

export function formatTime(dateString: string): string {
  return format(parseISO(dateString), 'h:mm a');
}

export const STATUS_CONFIG: Record<
  LeadStatus,
  { label: string; color: string; glow: string; dot: string }
> = {
  new: {
    label: 'New',
    color: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
    glow: 'shadow-[0_0_8px_rgba(139,92,246,0.5)]',
    dot: 'bg-violet-400',
  },
  qualifying: {
    label: 'Qualifying',
    color: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
    glow: 'shadow-[0_0_8px_rgba(6,182,212,0.5)]',
    dot: 'bg-teal-400',
  },
  hot: {
    label: 'Hot',
    color: 'text-red-400 bg-red-500/10 border-red-500/30',
    glow: 'shadow-[0_0_8px_rgba(239,68,68,0.5)]',
    dot: 'bg-red-400',
  },
  warm: {
    label: 'Warm',
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    glow: 'shadow-[0_0_8px_rgba(245,158,11,0.5)]',
    dot: 'bg-amber-400',
  },
  cold: {
    label: 'Cold',
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    glow: 'shadow-[0_0_8px_rgba(59,130,246,0.5)]',
    dot: 'bg-blue-400',
  },
  booked: {
    label: 'Booked',
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    glow: 'shadow-[0_0_8px_rgba(16,185,129,0.5)]',
    dot: 'bg-emerald-400',
  },
  cooled: {
    label: 'Cooled',
    color: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
    glow: '',
    dot: 'bg-slate-400',
  },
};

export const CHANNEL_CONFIG: Record<
  ChannelType,
  { label: string; color: string; icon: string }
> = {
  whatsapp: {
    label: 'WhatsApp',
    color: 'text-green-400 bg-green-500/10',
    icon: '💬',
  },
  telegram: {
    label: 'Telegram',
    color: 'text-sky-400 bg-sky-500/10',
    icon: '✈️',
  },
  email: {
    label: 'Email',
    color: 'text-violet-400 bg-violet-500/10',
    icon: '✉️',
  },
  slack: {
    label: 'Slack',
    color: 'text-pink-400 bg-pink-500/10',
    icon: '#️⃣',
  },
  manual: {
    label: 'Manual',
    color: 'text-slate-400 bg-slate-500/10',
    icon: '👤',
  },
};

export function getScoreColor(score: number): string {
  if (score >= 75) return '#EF4444';
  if (score >= 50) return '#F59E0B';
  if (score >= 25) return '#3B82F6';
  return '#6B7280';
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
