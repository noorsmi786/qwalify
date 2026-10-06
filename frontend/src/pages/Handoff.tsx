import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Flame,
  UserCheck,
  MessageSquare,
  Play,
  ArrowRight,
  Sparkles,
  Settings2,
  Users,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge, ChannelBadge } from '@/components/ui/Badge';
import { ScoreGauge } from '@/components/leads/ScoreGauge';
import { LeadAvatar } from '@/components/leads/LeadAvatar';
import { formatRelativeTime } from '@/lib/utils';
import { useLeadsData } from '@/hooks/useLeadsData';
import { HandoffSettingsPanel } from '@/components/settings/HandoffSettingsPanel';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function HandoffPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { leads: liveLeads } = useLeadsData();
  const [activeTab, setActiveTab] = useState<'queue' | 'settings'>('queue');
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  // Filter for leads needing human attention (bot paused, handoff ready, or hot score)
  const handoffQueue = liveLeads.filter(
    (l) => l.bot_paused || l.is_handoff_ready || l.status === 'hot'
  );

  const handleResolve = async (leadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setResolvingId(leadId);
    try {
      await fetch('/api/handoff/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId }),
      });

      if (isSupabaseConfigured) {
        await supabase
          .from('leads')
          .update({ bot_paused: false, is_handoff_ready: false })
          .eq('id', leadId);

        await supabase
          .from('conversations')
          .update({ state: 'active' })
          .eq('lead_id', leadId);
      }

      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead_detail', leadId] });
      toast.success('Handoff resolved! AI bot auto-replies resumed.');
    } catch {
      toast.error('Failed to resolve handoff.');
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <ShieldAlert className="w-6 h-6 text-amber-400" />
            Human Handoff & Rep Alerts
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Manage hot prospects requiring human closing, monitor paused bots, and configure internal rep alerts.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-navy-950 border border-navy-800 rounded-xl">
          <button
            onClick={() => setActiveTab('queue')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'queue'
                ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Needs Attention Queue</span>
            {handoffQueue.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[10px] font-bold">
                {handoffQueue.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'settings'
                ? 'bg-violet-600 text-white shadow-md shadow-violet-600/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Alert Settings</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-amber-500/20 bg-navy-900/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Awaiting Takeover</p>
              <p className="text-2xl font-bold text-amber-400 mt-1">{handoffQueue.length}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Hot leads & paused bots</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-lg">
              🔥
            </div>
          </CardContent>
        </Card>

        <Card className="border-teal-500/20 bg-navy-900/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active AI Qualifying</p>
              <p className="text-2xl font-bold text-teal-400 mt-1">
                {liveLeads.filter((l) => !l.bot_paused && l.status !== 'hot').length}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">AI answering questions</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center text-lg">
              🤖
            </div>
          </CardContent>
        </Card>

        <Card className="border-sky-500/20 bg-navy-900/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Rep Alert Channels</p>
              <p className="text-sm font-bold text-slate-200 mt-1 flex items-center gap-1.5">
                <span>✈️ Telegram</span>
                <span>•</span>
                <span>💬 WhatsApp</span>
              </p>
              <p className="text-[11px] text-teal-400 mt-0.5 font-medium">● Instant Notifications</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center text-lg">
              📲
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      {activeTab === 'queue' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-200 flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              Needs Attention Queue ({handoffQueue.length})
            </h2>
            <button
              onClick={() => setActiveTab('settings')}
              className="text-xs text-violet-400 hover:text-violet-300 font-medium underline flex items-center gap-1"
            >
              <Settings2 className="w-3.5 h-3.5" /> Configure Telegram / WhatsApp alerts
            </button>
          </div>

          {handoffQueue.length === 0 ? (
            <Card className="bg-navy-900/40 border-navy-700/80 p-12 text-center">
              <div className="max-w-md mx-auto space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center text-2xl mx-auto">
                  ✨
                </div>
                <h3 className="text-base font-semibold text-slate-200">No Pending Handoffs!</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Your AI SDR is actively qualifying all leads. When a lead reaches hot qualification ($\ge 75$) or asks to speak with a human, they will appear here and alert your reps.
                </p>
                <div className="pt-2 flex items-center justify-center gap-3">
                  <Button size="sm" variant="secondary" onClick={() => navigate('/leads')}>
                    View All Leads Pipeline
                  </Button>
                  <Button size="sm" onClick={() => setActiveTab('settings')}>
                    <Settings2 className="w-3.5 h-3.5 mr-1" /> Alert Settings
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {handoffQueue.map((lead, i) => (
                <motion.div
                  key={lead.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => navigate(`/leads/${lead.id}`)}
                  className="p-4 rounded-2xl border border-amber-500/30 bg-navy-900/80 hover:bg-navy-800/80 hover:border-amber-500/50 cursor-pointer transition-all space-y-3 shadow-lg shadow-black/20"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <LeadAvatar name={lead.full_name} size="md" />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-slate-100">{lead.full_name}</p>
                          <ChannelBadge channel={lead.source_channel} />
                          <StatusBadge status={lead.status} />
                          {lead.bot_paused && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30 flex items-center gap-1">
                              <UserCheck className="w-3 h-3" /> Bot Paused (Human Active)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{lead.contact}</p>
                      </div>
                    </div>

                    {/* Actions & Score */}
                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <ScoreGauge score={lead.score} size="sm" />
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={(e) => handleResolve(lead.id, e)}
                          loading={resolvingId === lead.id}
                          className="text-xs"
                          title="Resume AI qualification bot for this lead"
                        >
                          <Play className="w-3 h-3 mr-1 text-emerald-400" />
                          Resume AI
                        </Button>
                        <Button
                          size="sm"
                          className="bg-amber-600 hover:bg-amber-500 text-white text-xs shadow-md shadow-amber-600/20"
                        >
                          <MessageSquare className="w-3 h-3 mr-1" />
                          Take Over Chat <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-navy-800">
                    <span className="flex items-center gap-1 text-amber-400 font-medium">
                      <Sparkles className="w-3 h-3" /> Ready for human closing • AI replies paused
                    </span>
                    <span>Last active {formatRelativeTime(lead.last_contact_at)}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Settings View */
        <div className="space-y-4">
          <HandoffSettingsPanel />
        </div>
      )}
    </div>
  );
}
