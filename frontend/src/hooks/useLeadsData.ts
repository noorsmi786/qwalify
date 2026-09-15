import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useLeadsStore } from '@/store/leadsStore';
import { useAuthStore } from '@/store/authStore';
import type { Lead, LeadStatus } from '@/types';

export function useLeadsData() {
  const queryClient = useQueryClient();
  const { tenant } = useAuthStore();
  const { leads: localLeads, addLead: addLocalLead, updateLeadStatus: updateLocalStatus } = useLeadsStore();

  const query = useQuery({
    queryKey: ['leads', tenant?.id],
    queryFn: async (): Promise<Lead[]> => {
      if (!isSupabaseConfigured || !tenant?.id) {
        return localLeads;
      }

      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('last_contact_at', { ascending: false });

      if (error) {
        console.warn('Supabase fetch leads error, using local state:', error);
        return localLeads;
      }

      return (data || []).map((row) => ({
        id: row.id,
        tenant_id: row.tenant_id,
        full_name: row.full_name,
        contact: row.contact,
        source_channel: row.source_channel,
        status: row.status,
        score: row.score,
        tags: row.tags || [],
        notes: row.notes || '',
        created_at: row.created_at,
        last_contact_at: row.last_contact_at,
        is_handoff_ready: row.is_handoff_ready,
      }));
    },
    initialData: localLeads,
  });

  const createLeadMutation = useMutation({
    mutationFn: async (newLead: Lead) => {
      addLocalLead(newLead);

      if (isSupabaseConfigured && tenant?.id) {
        const { error } = await supabase.from('leads').insert({
          id: newLead.id.startsWith('lead_') ? undefined : newLead.id,
          tenant_id: tenant.id,
          full_name: newLead.full_name,
          contact: newLead.contact,
          source_channel: newLead.source_channel,
          status: newLead.status,
          score: newLead.score,
          tags: newLead.tags,
          notes: newLead.notes,
          is_handoff_ready: newLead.is_handoff_ready,
        });

        if (error) throw error;
      }
      return newLead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: LeadStatus }) => {
      updateLocalStatus(id, status);

      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('leads')
          .update({
            status,
            last_contact_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead_detail'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
    },
  });

  return {
    leads: query.data || localLeads,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    createLead: createLeadMutation.mutateAsync,
    updateLeadStatus: updateStatusMutation.mutateAsync,
  };
}
