import { cn, STATUS_CONFIG, CHANNEL_CONFIG } from '@/lib/utils';
import type { LeadStatus, ChannelType } from '@/types';

interface StatusBadgeProps {
  status: LeadStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
        config.color,
        config.glow,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />
      {config.label}
    </span>
  );
}

interface ChannelBadgeProps {
  channel: ChannelType;
  className?: string;
  showLabel?: boolean;
}

export function ChannelBadge({ channel, className, showLabel = true }: ChannelBadgeProps) {
  const config = CHANNEL_CONFIG[channel];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium',
        config.color,
        className
      )}
    >
      <span>{config.icon}</span>
      {showLabel && config.label}
    </span>
  );
}

interface TagProps {
  label: string;
  onRemove?: () => void;
}

export function Tag({ label, onRemove }: TagProps) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-navy-700 text-slate-300 text-xs font-medium border border-navy-600">
      {label}
      {onRemove && (
        <button onClick={onRemove} className="text-slate-500 hover:text-slate-200 ml-0.5">
          ×
        </button>
      )}
    </span>
  );
}
