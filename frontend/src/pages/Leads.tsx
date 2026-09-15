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
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Lead, LeadStatus, ChannelType } from '@/types';
import { useLeadsStore } from '@/store/leadsStore';
import { StatusBadge, ChannelBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ScoreGauge } from '@/components/leads/ScoreGauge';
import { LeadAvatar } from '@/components/leads/LeadAvatar';
import { formatRelativeTime } from '@/lib/utils';
import { AddLeadDrawer } from '@/components/leads/AddLeadDrawer';

const ALL_STATUSES: LeadStatus[] = ['new', 'qualifying', 'hot', 'warm', 'cold', 'booked', 'cooled'];
const ALL_CHANNELS: ChannelType[] = ['whatsapp', 'telegram', 'email', 'slack'];

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New', qualifying: 'Qualifying', hot: 'Hot', warm: 'Warm',
  cold: 'Cold', booked: 'Booked', cooled: 'Cooled',
};

const CHANNEL_LABELS: Record<ChannelType, string> = {
  whatsapp: 'WhatsApp', telegram: 'Telegram', email: 'Email', slack: 'Slack', manual: 'Manual',
};

import { useLeadsData } from '@/hooks/useLeadsData';

export default function LeadsPage() {
  const navigate = useNavigate();
  const { leads: liveLeads } = useLeadsData();
  const { filters, setSearch, toggleStatus, toggleChannel, resetFilters } = useLeadsStore();

  const filteredLeads = useMemo(() => {
    return liveLeads.filter((lead) => {
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
  }, [liveLeads, filters]);

  const [sorting, setSorting] = useState<SortingState>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(25);

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
    { key: 'full_name', label: 'Lead', sortable: true },
    { key: 'source_channel', label: 'Channel', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'score', label: 'Score', sortable: true },
    { key: 'assigned_rep', label: 'Assigned', sortable: false },
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
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-slate-500">
            {filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''}
            {activeFilterCount > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 text-xs">
                {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
              </span>
            )}
          </h2>
        </div>
        <Button onClick={() => setShowDrawer(true)}>
          <Plus className="w-4 h-4" /> Add Lead
        </Button>
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
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-navy-700 flex items-center justify-center text-2xl">
                        🔍
                      </div>
                      <p className="text-sm text-slate-500">No leads match your filters</p>
                      <Button variant="ghost" size="sm" onClick={resetFilters}>
                        Clear filters
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                pageLeads.map((lead, i) => (
                  <motion.tr
                    key={lead.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.2 }}
                    className="border-b border-navy-700/60 hover:bg-navy-700/30 cursor-pointer transition-colors"
                    onClick={() => navigate(`/leads/${lead.id}`)}
                  >
                    {/* Lead name + contact */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <LeadAvatar name={lead.full_name} size="sm" />
                        <div>
                          <p className="text-sm font-medium text-slate-200">{lead.full_name}</p>
                          <p className="text-xs text-slate-500">{lead.contact}</p>
                        </div>
                      </div>
                    </td>
                    {/* Channel */}
                    <td className="px-4 py-3">
                      <ChannelBadge channel={lead.source_channel} />
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusBadge status={lead.status} />
                    </td>
                    {/* Score */}
                    <td className="px-4 py-3">
                      <ScoreGauge score={lead.score} size="sm" />
                    </td>
                    {/* Assigned */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-400">{lead.assigned_rep ?? '—'}</span>
                    </td>
                    {/* Last contact */}
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-500 whitespace-nowrap">
                        {formatRelativeTime(lead.last_contact_at)}
                      </span>
                    </td>
                  </motion.tr>
                ))
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
