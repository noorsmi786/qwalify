import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useLeadsStore } from '@/store/leadsStore';
import { mockMessages, mockScoreHistory } from '@/mock';
import type { Lead, Message, ScoreHistory, LeadStatus } from '@/types';

export function useLeadDetailData(leadId: string | undefined) {
  const queryClient = useQueryClient();
  const { leads, updateLeadStatus: updateLocalStatus } = useLeadsStore();

  const query = useQuery({
    queryKey: ['lead_detail', leadId],
    queryFn: async (): Promise<{
      lead: Lead | null;
      messages: Message[];
      scoreHistory: ScoreHistory[];
    }> => {
      if (!leadId) {
        return { lead: null, messages: [], scoreHistory: [] };
      }

      if (!isSupabaseConfigured) {
        const lead = leads.find((l) => l.id === leadId) || null;
        const messages = mockMessages[leadId] || [];
        const scoreHistory = mockScoreHistory[leadId] || [];
        return { lead, messages, scoreHistory };
      }

      // Fetch Lead
      const { data: leadData } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .maybeSingle();

      if (!leadData) {
        // Fallback to local
        const lead = leads.find((l) => l.id === leadId) || null;
        return {
          lead,
          messages: mockMessages[leadId] || [],
          scoreHistory: mockScoreHistory[leadId] || [],
        };
      }

      const lead: Lead = {
        id: leadData.id,
        tenant_id: leadData.tenant_id,
        full_name: leadData.full_name,
        contact: leadData.contact,
        source_channel: leadData.source_channel,
        status: leadData.status,
        score: leadData.score,
        tags: leadData.tags || [],
        notes: leadData.notes || '',
        created_at: leadData.created_at,
        last_contact_at: leadData.last_contact_at,
        is_handoff_ready: leadData.is_handoff_ready,
      };

      // Fetch Messages
      const { data: messagesData } = await supabase
        .from('messages')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: true });

      const messages: Message[] = (messagesData || []).map((m) => ({
        id: m.id,
        lead_id: m.lead_id,
        tenant_id: m.tenant_id,
        sender: m.sender,
        content: m.content,
        created_at: m.created_at,
        channel: m.channel as Message['channel'],
      }));

      // Fetch Score History
      const { data: scoresData } = await supabase
        .from('qualification_scores')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: true });

      const scoreHistory: ScoreHistory[] = (scoresData || []).map((s) => ({
        date: s.created_at.split('T')[0],
        score: s.score,
      }));

      return {
        lead,
        messages: messages.length > 0 ? messages : mockMessages[leadId] || [],
        scoreHistory: scoreHistory.length > 0 ? scoreHistory : mockScoreHistory[leadId] || [],
      };
    },
    enabled: Boolean(leadId),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ status }: { status: LeadStatus }) => {
      if (!leadId) return;
      updateLocalStatus(leadId, status);

      if (isSupabaseConfigured) {
        await supabase
          .from('leads')
          .update({
            status,
            last_contact_at: new Date().toISOString(),
          })
          .eq('id', leadId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead_detail', leadId] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
    },
  });

  return {
    lead: query.data?.lead || leads.find((l) => l.id === leadId) || null,
    messages: query.data?.messages || (leadId ? mockMessages[leadId] || [] : []),
    scoreHistory: query.data?.scoreHistory || (leadId ? mockScoreHistory[leadId] || [] : []),
    isLoading: query.isLoading,
    updateStatus: updateStatusMutation.mutateAsync,
  };
}
