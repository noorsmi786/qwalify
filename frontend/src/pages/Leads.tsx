import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SortingState } from '@tanstack/react-table';
import {
  Search,
  SlidersHorizontal,
  Plus,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  X,
  ShieldAlert,
  Flame,
  Bot,
  UserCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Lead, LeadStatus, ChannelType } from '@/types';
import { useLeadsStore } from '@/store/leadsStore';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScoreGauge } from '@/components/leads/ScoreGauge';
import { LeadAvatar } from '@/components/leads/LeadAvatar';
import { formatRelativeTime } from '@/lib/utils';
import { AddLeadDrawer } from '@/components/leads/AddLeadDrawer';
import { useLeadsData } from '@/hooks/useLeadsData';

const ALL_STATUSES: LeadStatus[] = ['new', 'qualifying', 'hot', 'warm', 'cold', 'booked', 'cooled'];
const ALL_CHANNELS: ChannelType[] = ['whatsapp', 'telegram', 'email', 'slack'];

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New', qualifying: 'Qualifying', hot: 'Hot', warm: 'Warm',
  cold: 'Cold', booked: 'Booked', cooled: 'Cooled',
};

const CHANNEL_LABELS: Record<ChannelType, string> = {
  whatsapp: 'WhatsApp', telegram: 'Telegram', email: 'Email', slack: 'Slack', manual: 'Manual',
};

type QuickFilter = 'all' | 'needs_attention' | 'hot' | 'booked';

export default function LeadsPage() {
  const navigate = useNavigate();
  const { leads: liveLeads } = useLeadsData();
  const {
    filters,
    setSearch,
    toggleStatus,
    toggleChannel,
    resetFilters,
    loadDemoLeads,
    clearAllLeads,
  } = useLeadsStore();

  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  const needsAttentionCount = useMemo(() => {
    return liveLeads.filter((l) => l.bot_paused || l.is_handoff_ready || l.status === 'hot').length;
  }, [liveLeads]);

  const filteredLeads = useMemo(() => {
    return liveLeads.filter((lead) => {
      // Quick filter
      if (quickFilter === 'needs_attention') {
        const isNeedsAttention = lead.bot_paused || lead.is_handoff_ready || lead.status === 'hot';
        if (!isNeedsAttention) return false;
      } else if (quickFilter === 'hot') {
        if (lead.status !== 'hot' && lead.score < 75) return false;
      } else if (quickFilter === 'booked') {
        if (lead.status !== 'booked') return false;
      }

      const matchSearch =
        !filters.search ||
        lead.full_name.toLowerCase().includes(filters.search.toLowerCase()) ||
        lead.contact.toLowerCase().includes(filters.search.toLowerCase());

      const matchStatus =
        filters.statuses.length === 0 || filters.statuses.includes(lead.status);

      const matchChannel =
        filters.channels.length === 0 ||
        filters.channels.includes(lead.source_channel);

      const matchScore =
        lead.score >= filters.scoreMin && lead.score <= filters.scoreMax;

      return matchSearch && matchStatus && matchChannel && matchScore;
    });
  }, [liveLeads, filters, quickFilter]);

  const activeFilterCount = filters.statuses.length + filters.channels.length;

  // Sort data
  const sortedLeads = useMemo(() => {
    if (sorting.length === 0) return filteredLeads;
    const { id, desc } = sorting[0];
    return [...filteredLeads].sort((a, b) => {
      const aVal = (a as unknown as Record<string, unknown>)[id];
      const bVal = (b as unknown as Record<string, unknown>)[id];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      return desc ? -cmp : cmp;
    });
  }, [filteredLeads, sorting]);

  // Paginate
  const totalPages = Math.max(1, Math.ceil(sortedLeads.length / pageSize));
  const pageLeads = sortedLeads.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

  const COLUMNS: { key: keyof Lead | 'actions'; label: string; sortable?: boolean }[] = [
    { key: 'full_name', label: 'Name', sortable: true },
    { key: 'status', label: 'Status & Mode', sortable: true },
    { key: 'score', label: 'Score', sortable: true },
    { key: 'last_contact_at', label: 'Last Contact', sortable: true },
  ];

  const sortCol = sorting[0];

  const handleSort = (key: string) => {
    setSorting((prev) => {
      if (prev[0]?.id === key) {
        return prev[0].desc ? [] : [{ id: key, desc: true }];
      }
      return [{ id: key, desc: false }];
    });
    setPageIndex(0);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Leads Pipeline</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {filteredLeads.length} total lead{filteredLeads.length !== 1 ? 's' : ''}
            {activeFilterCount > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 text-xs">
                {activeFilterCount} custom filter active
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {liveLeads.length === 0 ? (
            <Button variant="ghost" size="sm" onClick={loadDemoLeads} className="text-xs text-slate-400 hover:text-slate-200">
              ✨ Load Sample Leads
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={clearAllLeads} className="text-xs text-slate-500 hover:text-red-400">
              Clear All
            </Button>
          )}
          <Button onClick={() => setShowDrawer(true)} className="shadow-lg shadow-violet-600/20">
            <Plus className="w-4 h-4 mr-1" /> Add Lead
          </Button>
        </div>
      </div>

      {/* Quick Filter Tabs (Needs Attention / Hot / Booked) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => { setQuickFilter('all'); setPageIndex(0); }}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
            quickFilter === 'all'
              ? 'bg-violet-600/20 text-violet-300 border-violet-500/40 shadow-[0_0_12px_rgba(124,58,237,0.15)]'
              : 'bg-navy-900/60 text-slate-400 border-navy-700 hover:text-slate-200'
          }`}
        >
          All Leads ({liveLeads.length})
        </button>
        <button
          onClick={() => { setQuickFilter('needs_attention'); setPageIndex(0); }}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
            quickFilter === 'needs_attention'
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
              : 'bg-navy-900/60 text-slate-400 border-navy-700 hover:text-amber-300 hover:border-amber-500/30'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          <span>🔥 Needs Attention</span>
          {needsAttentionCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500/30 text-amber-200 text-[10px] font-bold">
              {needsAttentionCount}
            </span>
          )}
        </button>
        <button
          onClick={() => { setQuickFilter('hot'); setPageIndex(0); }}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
            quickFilter === 'hot'
              ? 'bg-red-500/20 text-red-300 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.15)]'
              : 'bg-navy-900/60 text-slate-400 border-navy-700 hover:text-red-300 hover:border-red-500/30'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-red-400" />
          <span>Hot Leads</span>
        </button>
      </div>

      {/* Search + Filter bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search leads by name or contact…"
            value={filters.search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>
        <Button
          variant="secondary"
          onClick={() => setShowFilters(!showFilters)}
          className={showFilters ? 'border-violet-500/40 text-violet-400' : ''}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-violet-600 text-white text-xs flex items-center justify-center font-bold">
              {activeFilterCount}
            </span>
          )}
        </Button>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={resetFilters} className="text-slate-500">
            <X className="w-3 h-3" /> Clear
          </Button>
        )}
      </div>

      {/* Filter panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-xl border border-navy-700 bg-navy-800/40 space-y-4">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Status</p>
                <div className="flex flex-wrap gap-2">
                  {ALL_STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() => toggleStatus(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        filters.statuses.includes(s)
                          ? 'bg-violet-600/15 text-violet-400 border-violet-500/40'
                          : 'text-slate-500 border-navy-600 hover:border-violet-500/20 hover:text-slate-300'
                      }`}
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Channel</p>
                <div className="flex flex-wrap gap-2">
                  {ALL_CHANNELS.map((c) => (
                    <button
                      key={c}
                      onClick={() => toggleChannel(c)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        filters.channels.includes(c)
                          ? 'bg-violet-600/15 text-violet-400 border-violet-500/40'
                          : 'text-slate-500 border-navy-600 hover:border-violet-500/20 hover:text-slate-300'
                      }`}
                    >
                      {CHANNEL_LABELS[c]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="rounded-xl border border-navy-700 bg-navy-800/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-navy-700">
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer select-none hover:text-slate-300 transition-colors"
                    onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  >
                    <div className="flex items-center gap-1.5">
                      {col.label}
                      {col.sortable && (
                        <span className="text-slate-700">
                          {sortCol?.id === col.key ? (
                            sortCol.desc ? (
                              <ChevronDown className="w-3 h-3 text-violet-400" />
                            ) : (
                              <ChevronUp className="w-3 h-3 text-violet-400" />
                            )
                          ) : (
                            <ChevronsUpDown className="w-3 h-3" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageLeads.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-16 text-center">
                    {liveLeads.length === 0 ? (
                      <div className="flex flex-col items-center gap-3 max-w-sm mx-auto">
                        <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center text-2xl">
                          👥
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-200">No leads in your pipeline yet</p>
                          <p className="text-xs text-slate-400 mt-1">
                            Add a new lead manually or connect WhatsApp to receive leads automatically.
                          </p>
                        </div>
                        <div className="flex items-center gap-2 pt-2">
                          <Button size="sm" onClick={() => setShowDrawer(true)}>
                            <Plus className="w-3.5 h-3.5 mr-1" /> Add Lead
                          </Button>
                          <Button size="sm" variant="secondary" onClick={loadDemoLeads}>
                            ✨ Load Sample Data
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-navy-700 flex items-center justify-center text-2xl">
                          🔍
                        </div>
                        <p className="text-sm text-slate-500">No leads match your selected filters</p>
                        <Button variant="ghost" size="sm" onClick={() => { resetFilters(); setQuickFilter('all'); }}>
                          Reset all filters
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                pageLeads.map((lead, i) => {
                  const isPaused = lead.bot_paused || lead.is_handoff_ready;
                  return (
                    <motion.tr
                      key={lead.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.2 }}
                      className="border-b border-navy-700/60 hover:bg-navy-700/30 cursor-pointer transition-colors"
                      onClick={() => navigate(`/leads/${lead.id}`)}
                    >
                      {/* 1. Lead name + contact */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <LeadAvatar name={lead.full_name} size="sm" />
                          <div>
                            <p className="text-sm font-medium text-slate-200">{lead.full_name}</p>
                            <p className="text-xs text-slate-500">{lead.contact}</p>
                          </div>
                        </div>
                      </td>
                      {/* 2. Status & Mode (AI vs Bot Paused) */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusBadge status={lead.status} />
                          {isPaused ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold flex items-center gap-1">
                              <UserCheck className="w-2.5 h-2.5" /> Human Taking Over
                            </span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-navy-800 text-slate-500 font-medium flex items-center gap-1">
                              <Bot className="w-2.5 h-2.5 text-violet-400" /> AI Active
                            </span>
                          )}
                        </div>
                      </td>
                      {/* 3. Score */}
                      <td className="px-4 py-3.5">
                        <ScoreGauge score={lead.score} size="sm" />
                      </td>
                      {/* 4. Last contact */}
                      <td className="px-4 py-3.5">
                        <span className="text-xs text-slate-400 whitespace-nowrap">
                          {formatRelativeTime(lead.last_contact_at)}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-navy-700">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>Rows per page</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPageIndex(0);
              }}
              className="bg-navy-800 border border-navy-600 rounded-lg px-2 py-1 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-violet-500"
            >
              {[10, 25, 50, 100].map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span>
              Page {pageIndex + 1} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                disabled={pageIndex === 0}
                className="w-7 h-7 rounded-lg border border-navy-600 flex items-center justify-center hover:border-violet-500/40 hover:text-violet-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPageIndex((p) => Math.min(totalPages - 1, p + 1))}
                disabled={pageIndex >= totalPages - 1}
                className="w-7 h-7 rounded-lg border border-navy-600 flex items-center justify-center hover:border-violet-500/40 hover:text-violet-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Lead Drawer */}
      <AddLeadDrawer open={showDrawer} onClose={() => setShowDrawer(false)} />
    </div>
  );
}
