import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import {
  Users,
  Flame,
  CalendarCheck,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { mockStats, mockActivity } from '@/mock';
import { formatRelativeTime, STATUS_CONFIG, CHANNEL_CONFIG } from '@/lib/utils';
import type { ActivityEvent } from '@/types';

const STATUS_COLORS: Record<string, string> = {
  hot: '#EF4444',
  warm: '#F59E0B',
  qualifying: '#06B6D4',
  booked: '#10B981',
  cold: '#3B82F6',
  new: '#8B5CF6',
  cooled: '#6B7280',
};

const ACTIVITY_ICONS: Record<ActivityEvent['type'], string> = {
  lead_created: '✨',
  status_changed: '🔄',
  score_updated: '📈',
  booking_made: '📅',
  handoff_triggered: '🤝',
  follow_up_sent: '📩',
};

interface StatCardProps {
  title: string;
  value: string | number;
  change?: { value: number; label: string };
  icon: React.ReactNode;
  accent: 'violet' | 'teal' | 'hot' | 'emerald';
  delay?: number;
}

const ACCENT_STYLES = {
  violet: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  teal: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  hot: 'bg-red-500/10 text-red-400 border-red-500/20',
  emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

function StatCard({ title, value, change, icon, accent, delay = 0 }: StatCardProps) {
  const positive = (change?.value ?? 0) >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3, ease: 'easeOut' }}
    >
      <Card className="p-5 hover:border-violet-500/20 transition-colors">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</p>
            <p className="text-3xl font-bold text-slate-100 mt-2 font-mono">{value}</p>
            {change && (
              <div className="flex items-center gap-1 mt-2">
                {positive ? (
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5 text-red-400" />
                )}
                <span className={`text-xs font-medium ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
                  {positive ? '+' : ''}{change.value}%
                </span>
                <span className="text-xs text-slate-600">{change.label}</span>
              </div>
            )}
          </div>
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${ACCENT_STYLES[accent]}`}>
            {icon}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function ResponseRateGauge({ rate }: { rate: number }) {
  const circumference = 2 * Math.PI * 40;
  const progress = (rate / 100) * circumference * 0.75;
  return (
    <div className="flex flex-col items-center justify-center h-full py-4">
      <div className="relative w-32 h-32">
        <svg viewBox="0 0 100 100" className="-rotate-[135deg]" width={128} height={128}>
          <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(30,42,58,0.8)" strokeWidth="8"
            strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`} strokeLinecap="round" />
          <circle cx="50" cy="50" r="40" fill="none" stroke="#06B6D4" strokeWidth="8"
            strokeDasharray={`${progress} ${circumference - progress}`}
            strokeLinecap="round"
            style={{ filter: 'drop-shadow(0 0 6px rgba(6,182,212,0.6))', transition: 'stroke-dasharray 1s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-teal-400 font-mono">{rate}%</span>
          <span className="text-xs text-slate-500">Response</span>
        </div>
      </div>
    </div>
  );
}

function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  return (
    <div className="space-y-3">
      {events.map((event, i) => (
        <motion.div
          key={event.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05, duration: 0.2 }}
          className="flex items-start gap-3"
        >
          <div className="w-8 h-8 rounded-lg bg-navy-700 border border-navy-600 flex items-center justify-center text-sm flex-shrink-0 mt-0.5">
            {ACTIVITY_ICONS[event.type]}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-slate-300 font-medium truncate">{event.lead_name}</p>
            <p className="text-xs text-slate-500 truncate">{event.description}</p>
          </div>
          <span className="text-xs text-slate-600 whitespace-nowrap flex-shrink-0">
            {formatRelativeTime(event.created_at)}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

import { useDashboardData } from '@/hooks/useDashboardData';
import { useAuthStore } from '@/store/authStore';

export default function DashboardPage() {
  const { data: stats = mockStats } = useDashboardData();
  const { isBackendConnected, tenant } = useAuthStore();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-slate-500">Overview — {tenant?.name || 'Workspace'}</h2>
          <p className="text-xs text-slate-600 mt-0.5">
            {isBackendConnected ? 'Connected to Supabase PostgreSQL' : 'Interactive Demo Mode (Connect Supabase in .env)'}
          </p>
        </div>
        {isBackendConnected && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live Database
          </span>
        )}
      </div>

      {/* Bento Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Leads"
          value={stats.total_leads}
          change={{ value: 20, label: 'vs last week' }}
          icon={<Users className="w-5 h-5" />}
          accent="violet"
          delay={0}
        />
        <StatCard
          title="Hot Leads"
          value={stats.hot_leads}
          change={{ value: 50, label: 'vs last week' }}
          icon={<Flame className="w-5 h-5" />}
          accent="hot"
          delay={0.05}
        />
        <StatCard
          title="Bookings"
          value={stats.bookings_this_month}
          change={{ value: -1, label: 'vs last month' }}
          icon={<CalendarCheck className="w-5 h-5" />}
          accent="emerald"
          delay={0.1}
        />
        <StatCard
          title="Response Rate"
          value={`${stats.response_rate}%`}
          change={{ value: 5, label: 'vs last week' }}
          icon={<TrendingUp className="w-5 h-5" />}
          accent="teal"
          delay={0.15}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Lead trend */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="lg:col-span-2"
        >
          <Card className="h-64">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-200">Lead Growth</p>
                  <p className="text-xs text-slate-500 mt-0.5">New leads per day (last 7 days)</p>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20">
                  <Zap className="w-3 h-3 text-violet-400" />
                  <span className="text-xs text-violet-400 font-medium">Live</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={stats.leads_trend}>
                  <defs>
                    <linearGradient id="violet-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip
                    contentStyle={{ background: '#111827', border: '1px solid #1a2234', borderRadius: '8px', fontSize: '12px' }}
                    labelStyle={{ color: '#94a3b8' }}
                    itemStyle={{ color: '#a78bfa' }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#7C3AED" strokeWidth={2} fill="url(#violet-grad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Response rate gauge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.3 }}
        >
          <Card className="h-64">
            <CardHeader>
              <p className="text-sm font-semibold text-slate-200">Response Rate</p>
              <p className="text-xs text-slate-500 mt-0.5">Leads that replied within 24h</p>
            </CardHeader>
            <CardContent className="pt-0">
              <ResponseRateGauge rate={stats.response_rate} />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Status breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
        >
          <Card className="h-72">
            <CardHeader>
              <p className="text-sm font-semibold text-slate-200">Status Breakdown</p>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-center">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie
                      data={stats.status_breakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="count"
                    >
                      {stats.status_breakdown.map((entry) => (
                        <Cell key={entry.status} fill={STATUS_COLORS[entry.status]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-1 mt-1">
                {stats.status_breakdown.map((entry) => (
                  <div key={entry.status} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: STATUS_COLORS[entry.status] }} />
                    <span className="text-xs text-slate-500 capitalize">{STATUS_CONFIG[entry.status].label}</span>
                    <span className="text-xs text-slate-400 font-mono ml-auto">{entry.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Channel breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.3 }}
        >
          <Card className="h-72">
            <CardHeader>
              <p className="text-sm font-semibold text-slate-200">Top Sources</p>
            </CardHeader>
            <CardContent className="pt-0">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={stats.channel_breakdown} layout="vertical" barSize={14}>
                  <XAxis type="number" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="channel"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={60}
                    tickFormatter={(v) => CHANNEL_CONFIG[v as keyof typeof CHANNEL_CONFIG]?.label ?? v}
                  />
                  <Tooltip
                    contentStyle={{ background: '#111827', border: '1px solid #1a2234', borderRadius: '8px', fontSize: '12px' }}
                    labelFormatter={(v) => CHANNEL_CONFIG[v as keyof typeof CHANNEL_CONFIG]?.label ?? v}
                    itemStyle={{ color: '#a78bfa' }}
                  />
                  <Bar dataKey="count" fill="#7C3AED" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Activity feed */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.3 }}
        >
          <Card className="h-72">
            <CardHeader>
              <p className="text-sm font-semibold text-slate-200">Recent Activity</p>
            </CardHeader>
            <CardContent className="pt-0 overflow-y-auto max-h-48">
              <ActivityFeed events={mockActivity} />
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
