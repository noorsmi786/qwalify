import { Link } from 'react-router-dom';
import {
  Users,
  Flame,
  CalendarCheck,
  Clock,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { mockStats } from '@/mock';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useAuthStore } from '@/store/authStore';

interface StatCardProps {
  title: string;
  subtitle: string;
  value: string | number;
  change?: { value: number; label: string };
  icon: React.ReactNode;
  accent: 'violet' | 'teal' | 'hot' | 'emerald';
  delay?: number;
  linkTo?: string;
}

const ACCENT_STYLES = {
  violet: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  teal: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  hot: 'bg-red-500/10 text-red-400 border-red-500/20',
  emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

function StatCard({ title, subtitle, value, change, icon, accent, delay = 0, linkTo }: StatCardProps) {
  const positive = (change?.value ?? 0) >= 0;
  
  const content = (
    <Card className="p-6 hover:border-violet-500/30 transition-all duration-200 group bg-navy-900/80 backdrop-blur-md">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</p>
          <p className="text-3xl sm:text-4xl font-bold text-slate-100 font-mono tracking-tight pt-1">
            {value}
          </p>
          <p className="text-xs text-slate-500 pt-1">{subtitle}</p>

          {change && (
            <div className="flex items-center gap-1 pt-2">
              {positive ? (
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5 text-red-400" />
              )}
              <span className={`text-xs font-semibold ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
                {positive ? '+' : ''}{change.value}%
              </span>
              <span className="text-xs text-slate-500">{change.label}</span>
            </div>
          )}
        </div>

        <div
          className={`w-12 h-12 rounded-2xl border flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform ${ACCENT_STYLES[accent]}`}
        >
          {icon}
        </div>
      </div>
    </Card>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3, ease: 'easeOut' }}
    >
      {linkTo ? <Link to={linkTo}>{content}</Link> : content}
    </motion.div>
  );
}

export default function DashboardPage() {
  const { data: stats = mockStats } = useDashboardData();
  const { user, tenant } = useAuthStore();

  const userName = user?.full_name?.split(' ')[0] || tenant?.name || 'there';
  const activeFollowups = Math.max(1, Math.round((stats.total_leads || 0) * 0.42));

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Friendly Header with 1 Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-navy-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            Welcome back, {userName}! 👋
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Here is a snapshot of your automated lead qualification today.
          </p>
        </div>

        {/* Clear Primary Action & Subtle Secondary */}
        <div className="flex items-center gap-3">
          <Link to="/onboarding">
            <Button variant="secondary" size="sm" className="text-xs text-slate-400 hover:text-slate-200">
              <Sparkles className="w-3.5 h-3.5 text-violet-400 mr-1.5" /> Setup Wizard
            </Button>
          </Link>
          <Link to="/leads">
            <Button className="shadow-lg shadow-violet-600/25">
              View All Leads <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Exactly 4 Clean Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Inquiries"
          subtitle="Captured customer chats"
          value={stats.total_leads}
          change={{ value: 18, label: 'this week' }}
          icon={<Users className="w-6 h-6" />}
          accent="violet"
          delay={0}
          linkTo="/leads"
        />

        <StatCard
          title="Hot Leads"
          subtitle="High-intent & ready to buy"
          value={stats.hot_leads}
          change={{ value: 45, label: 'this week' }}
          icon={<Flame className="w-6 h-6" />}
          accent="hot"
          delay={0.06}
          linkTo="/leads"
        />

        <StatCard
          title="Appointments Booked"
          subtitle="Auto-scheduled on calendar"
          value={stats.bookings_this_month}
          change={{ value: 12, label: 'this month' }}
          icon={<CalendarCheck className="w-6 h-6" />}
          accent="emerald"
          delay={0.12}
          linkTo="/bookings"
        />

        <StatCard
          title="Active Follow-ups"
          subtitle="Automatic check-ins running"
          value={activeFollowups}
          change={{ value: 8, label: 'active sequences' }}
          icon={<Clock className="w-6 h-6" />}
          accent="teal"
          delay={0.18}
          linkTo="/leads"
        />
      </div>
    </div>
  );
}
