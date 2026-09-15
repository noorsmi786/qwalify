import { getInitials } from '@/lib/utils';

const COLORS = [
  'from-violet-500 to-purple-600',
  'from-teal-500 to-cyan-600',
  'from-pink-500 to-rose-600',
  'from-amber-500 to-orange-600',
  'from-emerald-500 to-green-600',
  'from-blue-500 to-indigo-600',
];

interface LeadAvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LeadAvatar({ name, size = 'md' }: LeadAvatarProps) {
  const colorIndex = name.charCodeAt(0) % COLORS.length;
  const gradient = COLORS[colorIndex];

  const sizeClass = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base',
  }[size];

  return (
    <div
      className={`${sizeClass} rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center font-semibold text-white flex-shrink-0`}
    >
      {getInitials(name)}
    </div>
  );
}
