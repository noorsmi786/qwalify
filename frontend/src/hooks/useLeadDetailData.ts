import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useLeadsStore } from '@/store/leadsStore';
import { useAuthStore } from '@/store/authStore';
import { mockMessages, mockScoreHistory } from '@/mock';
import type { Lead, Message, ScoreHistory, LeadStatus } from '@/types';

export function useLeadDetailData(leadId: string | undefined) {
  const queryClient = useQueryClient();
  const { tenant, user } = useAuthStore();
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
        bot_paused: leadData.bot_paused ?? leadData.metadata?.bot_paused ?? false,
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

  const sendManualReplyMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!leadId || !content.trim()) return;

      const activeLead = query.data?.lead;
      const targetTenantId = activeLead?.tenant_id || tenant?.id;

      // 1. Call backend relay endpoint to dispatch to WhatsApp / original channel
      try {
        await fetch('/api/leads/reply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leadId,
            tenantId: targetTenantId,
            message: content,
            repName: user?.full_name || 'Human Rep',
          }),
        });
      } catch (e) {
        console.warn('Backend reply endpoint error, saving to DB directly:', e);
      }

      // 2. Insert into Supabase messages
      if (isSupabaseConfigured) {
        // Find or create conversation
        const { data: conv } = await supabase
          .from('conversations')
          .select('id')
          .eq('lead_id', leadId)
          .maybeSingle();

        if (conv?.id) {
          await supabase.from('messages').insert({
            tenant_id: targetTenantId,
            conversation_id: conv.id,
            lead_id: leadId,
            sender: 'human',
            content,
            channel: activeLead?.source_channel || 'whatsapp',
          });

          // Ensure bot is paused when human replies
          await supabase
            .from('leads')
            .update({
              bot_paused: true,
              is_handoff_ready: true,
              last_contact_at: new Date().toISOString(),
            })
            .eq('id', leadId);

          await supabase
            .from('conversations')
            .update({ state: 'paused' })
            .eq('id', conv.id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead_detail', leadId] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const triggerHandoffMutation = useMutation({
    mutationFn: async () => {
      if (!leadId) return;
      const activeLead = query.data?.lead;
      const targetTenantId = activeLead?.tenant_id || tenant?.id;

      // 1. Call backend handoff trigger API
      try {
        await fetch('/api/handoff/trigger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leadId,
            tenantId: targetTenantId,
            reason: 'manual_flag',
            repId: user?.id,
          }),
        });
      } catch (err) {
        console.warn('Handoff trigger API err:', err);
      }

      // 2. Direct Supabase update
      if (isSupabaseConfigured) {
        await supabase
          .from('leads')
          .update({
            bot_paused: true,
            is_handoff_ready: true,
            last_contact_at: new Date().toISOString(),
          })
          .eq('id', leadId);

        await supabase
          .from('conversations')
          .update({ state: 'paused' })
          .eq('lead_id', leadId);

        try {
          await supabase.from('handoff_events').insert({
            tenant_id: targetTenantId,
            lead_id: leadId,
            reason: 'manual_flag',
            status: 'claimed',
            assigned_rep_id: user?.id,
            notes: JSON.stringify({ summary: 'Manually claimed by rep from dashboard' }),
          });
        } catch {
          // ignore if table schema differences
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead_detail', leadId] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const resolveHandoffMutation = useMutation({
    mutationFn: async () => {
      if (!leadId) return;
      const activeLead = query.data?.lead;
      const targetTenantId = activeLead?.tenant_id || tenant?.id;

      // 1. Call backend handoff resolve API
      try {
        await fetch('/api/handoff/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leadId,
            tenantId: targetTenantId,
          }),
        });
      } catch (err) {
        console.warn('Handoff resolve API err:', err);
      }

      // 2. Direct Supabase update
      if (isSupabaseConfigured) {
        await supabase
          .from('leads')
          .update({
            bot_paused: false,
            is_handoff_ready: false,
            last_contact_at: new Date().toISOString(),
          })
          .eq('id', leadId);

        await supabase
          .from('conversations')
          .update({ state: 'active' })
          .eq('lead_id', leadId);

        try {
          await supabase
            .from('handoff_events')
            .update({
              status: 'resolved',
              resolved_at: new Date().toISOString(),
            })
            .eq('lead_id', leadId)
            .eq('status', 'pending');
        } catch {
          // ignore
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead_detail', leadId] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  return {
    lead: query.data?.lead || leads.find((l) => l.id === leadId) || null,
    messages: query.data?.messages || (leadId ? mockMessages[leadId] || [] : []),
    scoreHistory: query.data?.scoreHistory || (leadId ? mockScoreHistory[leadId] || [] : []),
    isLoading: query.isLoading,
    updateStatus: updateStatusMutation.mutateAsync,
    sendManualReply: sendManualReplyMutation.mutateAsync,
    isSendingReply: sendManualReplyMutation.isPending,
    triggerHandoff: triggerHandoffMutation.mutateAsync,
    isTriggeringHandoff: triggerHandoffMutation.isPending,
    resolveHandoff: resolveHandoffMutation.mutateAsync,
    isResolvingHandoff: resolveHandoffMutation.isPending,
  };
}
