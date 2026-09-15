import { create } from 'zustand';
import type { Lead, LeadStatus, ChannelType } from '@/types';
import { mockLeads } from '@/mock';

interface LeadsFilters {
  search: string;
  statuses: LeadStatus[];
  channels: ChannelType[];
  scoreMin: number;
  scoreMax: number;
}

interface LeadsState {
  leads: Lead[];
  filters: LeadsFilters;
  setSearch: (search: string) => void;
  toggleStatus: (status: LeadStatus) => void;
  toggleChannel: (channel: ChannelType) => void;
  setScoreRange: (min: number, max: number) => void;
  resetFilters: () => void;
  addLead: (lead: Lead) => void;
  updateLeadStatus: (id: string, status: LeadStatus) => void;
  getFilteredLeads: () => Lead[];
}

const defaultFilters: LeadsFilters = {
  search: '',
  statuses: [],
  channels: [],
  scoreMin: 0,
  scoreMax: 100,
};

export const useLeadsStore = create<LeadsState>()((set, get) => ({
  leads: mockLeads,
  filters: defaultFilters,

  setSearch: (search) => set((s) => ({ filters: { ...s.filters, search } })),

  toggleStatus: (status) =>
    set((s) => ({
      filters: {
        ...s.filters,
        statuses: s.filters.statuses.includes(status)
          ? s.filters.statuses.filter((st) => st !== status)
          : [...s.filters.statuses, status],
      },
    })),

  toggleChannel: (channel) =>
    set((s) => ({
      filters: {
        ...s.filters,
        channels: s.filters.channels.includes(channel)
          ? s.filters.channels.filter((ch) => ch !== channel)
          : [...s.filters.channels, channel],
      },
    })),

  setScoreRange: (min, max) =>
    set((s) => ({ filters: { ...s.filters, scoreMin: min, scoreMax: max } })),

  resetFilters: () => set({ filters: defaultFilters }),

  addLead: (lead) => set((s) => ({ leads: [lead, ...s.leads] })),

  updateLeadStatus: (id, status) =>
    set((s) => ({
      leads: s.leads.map((l) =>
        l.id === id
          ? { ...l, status, last_contact_at: new Date().toISOString() }
          : l
      ),
    })),

  getFilteredLeads: () => {
    const { leads, filters } = get();
    return leads.filter((lead) => {
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
  },
}));
