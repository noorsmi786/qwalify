import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  ArrowLeft,
  Phone,
  Mail,
  Tag,
  ChevronDown,
  AlertTriangle,
  UserCheck,
  Bot,
  User,
  Send,
} from 'lucide-react';
import { motion } from 'framer-motion';

import { StatusBadge, ChannelBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { ScoreGauge } from '@/components/leads/ScoreGauge';
import { LeadAvatar } from '@/components/leads/LeadAvatar';
import { FollowUpStatusPanel } from '@/components/leads/FollowUpStatusPanel';
import { formatDate, formatTime, STATUS_CONFIG, getScoreColor } from '@/lib/utils';
import type { LeadStatus, Message } from '@/types';

const ALL_STATUSES: LeadStatus[] = ['new', 'qualifying', 'hot', 'warm', 'cold', 'booked', 'cooled'];

function ChatBubble({ message }: { message: Message }) {
  const isLead = message.sender === 'lead';
  const isAI = message.sender === 'ai';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex gap-2 ${isLead ? 'justify-start' : 'justify-end'}`}
    >
      {isLead && (
        <div className="w-7 h-7 rounded-full bg-navy-600 border border-navy-500 flex items-center justify-center flex-shrink-0 mt-1">
          <User className="w-3.5 h-3.5 text-slate-400" />
        </div>
      )}
      <div className={`max-w-[75%] ${isLead ? '' : 'items-end flex flex-col'}`}>
        {!isLead && (
          <div className="flex items-center gap-1 mb-1">
            {isAI ? (
              <>
                <Bot className="w-3 h-3 text-violet-400" />
                <span className="text-[10px] text-violet-400 font-medium">AI</span>
              </>
            ) : (
              <>
                <UserCheck className="w-3 h-3 text-teal-400" />
                <span className="text-[10px] text-teal-400 font-medium">Human</span>
              </>
            )}
          </div>
        )}
        <div
          className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
            isLead
              ? 'bg-navy-700 border border-navy-600 text-slate-300 rounded-tl-sm'
              : isAI
              ? 'bg-violet-600/20 border border-violet-500/30 text-slate-200 rounded-tr-sm'
              : 'bg-teal-500/15 border border-teal-500/25 text-slate-200 rounded-tr-sm'
          }`}
        >
          {message.content}
        </div>
        <p className="text-[10px] text-slate-600 mt-1">{formatTime(message.created_at)}</p>
      </div>
    </motion.div>
  );
}

import { useLeadDetailData } from '@/hooks/useLeadDetailData';

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { lead, messages, scoreHistory, isLoading, updateStatus } = useLeadDetailData(id);

  const [statusOpen, setStatusOpen] = useState(false);
  const [manualOverride, setManualOverride] = useState(false);

  if (!lead && !isLoading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-full gap-4">
        <div className="text-4xl">🔍</div>
        <p className="text-slate-500">Lead not found</p>
        <Button variant="secondary" onClick={() => navigate('/leads')}>
          <ArrowLeft className="w-4 h-4" /> Back to Leads
        </Button>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="p-12 flex justify-center items-center">
        <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const handleStatusChange = async (status: LeadStatus) => {
    await updateStatus({ status });
    setManualOverride(true);
    setStatusOpen(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumb */}
      <div className="px-6 py-4 border-b border-navy-700 flex items-center gap-3">
        <button
          onClick={() => navigate('/leads')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-violet-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Leads
        </button>
        <span className="text-slate-700">/</span>
        <span className="text-sm text-slate-300 font-medium">{lead.full_name}</span>
        {manualOverride && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
            Manual override
          </span>
        )}
      </div>

      {/* Handoff banner */}
      {lead.is_handoff_ready && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="px-6 py-3 bg-emerald-500/8 border-b border-emerald-500/20 flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium text-emerald-400">
              This lead is ready for human handoff — score is{' '}
              <span className="font-mono">{lead.score}/100</span>
            </span>
          </div>
          <Button variant="outline" size="sm" className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10">
            <UserCheck className="w-3.5 h-3.5" /> Assign to Rep
          </Button>
        </motion.div>
      )}

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* Left panel */}
        <div className="w-80 flex-shrink-0 border-r border-navy-700 overflow-y-auto p-5 space-y-4">
          {/* Contact card */}
          <Card>
            <CardContent className="pt-5">
              <div className="flex flex-col items-center text-center mb-4">
                <LeadAvatar name={lead.full_name} size="lg" />
                <h2 className="text-base font-semibold text-slate-100 mt-3">{lead.full_name}</h2>
                <div className="flex items-center gap-1.5 mt-1">
                  {lead.contact.includes('@') ? (
                    <Mail className="w-3 h-3 text-slate-500" />
                  ) : (
                    <Phone className="w-3 h-3 text-slate-500" />
                  )}
                  <span className="text-xs text-slate-500">{lead.contact}</span>
                </div>
                <div className="mt-2">
                  <ChannelBadge channel={lead.source_channel} />
                </div>
              </div>

              {/* Status selector */}
              <div className="relative">
                <p className="text-xs font-medium text-slate-500 mb-1.5">Status</p>
                <button
                  onClick={() => setStatusOpen(!statusOpen)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-navy-600 bg-navy-900/60 hover:border-violet-500/30 transition-all"
                >
                  <StatusBadge status={lead.status} />
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                </button>
                {statusOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-navy-800 border border-navy-600 rounded-xl shadow-xl z-20 p-1.5 space-y-0.5">
                    {ALL_STATUSES.map((s) => (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(s)}
                        className={`w-full px-3 py-2 rounded-lg flex items-center gap-2 text-sm hover:bg-navy-700 transition-colors ${
                          s === lead.status ? 'bg-violet-600/10' : ''
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[s].dot}`} />
                        <span className="text-slate-300">{STATUS_CONFIG[s].label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Score gauge */}
          <Card>
            <CardHeader>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Qualification Score</p>
            </CardHeader>
            <CardContent className="pt-0 flex flex-col items-center gap-3">
              <ScoreGauge score={lead.score} size="lg" />
              <div className="w-full">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-500">Cold</span>
                  <span className="text-slate-500">Hot</span>
                </div>
                <div className="h-1.5 rounded-full bg-navy-700 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${lead.score}%`,
                      background: getScoreColor(lead.score),
                      boxShadow: `0 0 8px ${getScoreColor(lead.score)}88`,
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Score history */}
          {scoreHistory.length > 0 && (
            <Card>
              <CardHeader>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Score History</p>
              </CardHeader>
              <CardContent className="pt-0">
                <ResponsiveContainer width="100%" height={100}>
                  <LineChart data={scoreHistory}>
                    <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={(v) => v.slice(5)} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#475569', fontSize: 9 }} axisLine={false} tickLine={false} width={24} />
                    <Tooltip
                      contentStyle={{ background: '#111827', border: '1px solid #1a2234', borderRadius: '8px', fontSize: '11px' }}
                      itemStyle={{ color: '#a78bfa' }}
                    />
                    <Line type="monotone" dataKey="score" stroke="#7C3AED" strokeWidth={2} dot={{ fill: '#7C3AED', r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Tags */}
          {lead.tags.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-slate-500" />
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tags</p>
                </div>
              </CardHeader>
              <CardContent className="pt-0 flex flex-wrap gap-2">
                {lead.tags.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 rounded-md bg-navy-700 border border-navy-600 text-xs text-slate-400">
                    {tag}
                  </span>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Follow-Up Sequence Panel */}
          <FollowUpStatusPanel leadId={lead.id} leadStatus={lead.status} />

          {/* Notes */}
          <Card>
            <CardHeader>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Notes</p>
            </CardHeader>
            <CardContent className="pt-0">
              <textarea
                defaultValue={lead.notes}
                rows={4}
                placeholder="Add notes about this lead…"
                className="w-full bg-transparent text-sm text-slate-400 placeholder-slate-600 resize-none focus:outline-none leading-relaxed"
              />
            </CardContent>
          </Card>

          {/* Meta */}
          <div className="text-xs text-slate-600 space-y-1 px-1">
            <div className="flex justify-between">
              <span>Created</span>
              <span className="text-slate-500">{formatDate(lead.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span>Last contact</span>
              <span className="text-slate-500">{formatDate(lead.last_contact_at)}</span>
            </div>
            {lead.assigned_rep && (
              <div className="flex justify-between">
                <span>Assigned to</span>
                <span className="text-slate-500">{lead.assigned_rep}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right panel — Conversation */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="px-6 py-3 border-b border-navy-700 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <p className="text-sm font-medium text-slate-300">Conversation</p>
            <span className="text-xs text-slate-600">via {lead.source_channel}</span>
            <div className="ml-auto flex items-center gap-1.5 text-xs text-slate-500">
              <Bot className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-violet-400">AI-managed</span>
            </div>
          </div>

          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
              <div className="w-14 h-14 rounded-2xl bg-navy-800 border border-navy-700 flex items-center justify-center text-2xl">
                💬
              </div>
              <p className="text-sm text-slate-500">No conversation yet</p>
              <p className="text-xs text-slate-600 max-w-xs">
                When this lead starts a conversation, messages will appear here.
              </p>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((msg) => (
                  <ChatBubble key={msg.id} message={msg} />
                ))}
              </div>

              {/* Reply input (disabled in Phase 1) */}
              <div className="px-6 py-4 border-t border-navy-700">
                <div className="flex items-center gap-2 p-3 rounded-xl border border-navy-700 bg-navy-800/60">
                  <input
                    type="text"
                    placeholder="Manual reply (available in Phase 3)…"
                    disabled
                    className="flex-1 bg-transparent text-sm text-slate-500 placeholder-slate-700 focus:outline-none disabled:cursor-not-allowed"
                  />
                  <button disabled className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/20 flex items-center justify-center text-violet-600 opacity-40 cursor-not-allowed">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[10px] text-slate-700 text-center mt-1.5">
                  Channel integrations coming in Phase 3
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
