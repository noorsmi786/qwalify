import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FollowUpSequence {
  id: string;
  tenant_id: string;
  name: string;
  phase1_days: number;
  phase1_interval: string;
  phase2_weeks: number;
  phase2_interval: string;
  cool_after_days: number;
  is_active: boolean;
  is_default: boolean;
  phase1_message_template: string;
  phase2_message_template: string;
  cool_message_template: string;
  created_at: string;
  updated_at: string;
}

export interface LeadFollowUpState {
  id: string;
  lead_id: string;
  sequence_id: string;
  current_phase: 1 | 2 | 3;
  attempt_number: number;
  phase1_sent: number;
  phase2_sent: number;
  next_followup_at: string | null;
  last_followup_at: string | null;
  paused: boolean;
  paused_reason: string | null;
  started_at: string;
  cooled_at: string | null;
}

export interface FollowUpEvent {
  id: string;
  lead_id: string;
  sequence_id: string;
  phase: 1 | 2;
  attempt_number: number;
  scheduled_for: string;
  sent_at: string | null;
  status: 'pending' | 'sent' | 'failed' | 'cancelled' | 'skipped';
}

// ─── Mock data (fallback when Supabase not connected) ─────────────────────────

const MOCK_SEQUENCE: FollowUpSequence = {
  id: 'seq-mock-1',
  tenant_id: 'tenant-mock',
  name: 'Default Cadence',
  phase1_days: 7,
  phase1_interval: '1 day',
  phase2_weeks: 8,
  phase2_interval: '7 days',
  cool_after_days: 56,
  is_active: true,
  is_default: true,
  phase1_message_template:
    "Hi {{lead_name}} 👋, just following up on our earlier chat about {{company_name}}. Did you get a chance to think it over? I'd love to help answer any questions!",
  phase2_message_template:
    "Hey {{lead_name}}, hope you're having a great week! Still thinking about {{company_name}}? We've helped businesses like yours see real results. Happy to chat when you're ready 🙌",
  cool_message_template:
    "Hi {{lead_name}}, we're wrapping up our outreach for now. If you're ever ready to explore how {{company_name}} can help, we're always here. Take care! 👋",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const MOCK_FOLLOWUP_STATE: LeadFollowUpState = {
  id: 'lfs-mock-1',
  lead_id: 'lead-mock-1',
  sequence_id: 'seq-mock-1',
  current_phase: 1,
  attempt_number: 3,
  phase1_sent: 3,
  phase2_sent: 0,
  next_followup_at: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
  last_followup_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  paused: false,
  paused_reason: null,
  started_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  cooled_at: null,
};

// ─── Hook: Sequence Settings (for Settings → Cadence tab) ─────────────────────

export function useFollowUpSequence() {
  const { tenant } = useAuthStore();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['follow_up_sequence', tenant?.id],
    queryFn: async (): Promise<FollowUpSequence> => {
      if (!isSupabaseConfigured || !tenant?.id) return MOCK_SEQUENCE;

      const { data, error } = await supabase
        .from('follow_up_sequences')
        .select('*')
        .eq('tenant_id', tenant.id)
        .eq('is_default', true)
        .maybeSingle();

      if (error) throw error;
      return data ?? MOCK_SEQUENCE;
    },
    enabled: true,
    staleTime: 30_000,
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<FollowUpSequence>) => {
      if (!isSupabaseConfigured || !tenant?.id) {
        // Optimistic local-only update in mock mode
        return { ...MOCK_SEQUENCE, ...updates };
      }

      const existing = query.data;
      if (existing?.id && existing.id !== 'seq-mock-1') {
        const { data, error } = await supabase
          .from('follow_up_sequences')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        // Create default sequence for tenant
        const { data, error } = await supabase
          .from('follow_up_sequences')
          .insert({
            tenant_id: tenant.id,
            name: 'Default Cadence',
            is_active: true,
            is_default: true,
            ...updates,
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['follow_up_sequence', tenant?.id] });
      toast.success('Follow-up cadence saved successfully.');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to save cadence settings.');
    },
  });

  return {
    sequence: query.data ?? MOCK_SEQUENCE,
    isLoading: query.isLoading,
    updateSequence: updateMutation.mutate,
    isSaving: updateMutation.isPending,
  };
}

// ─── Hook: Per-Lead Follow-Up State (for Lead Detail panel) ──────────────────

export function useLeadFollowUpState(leadId: string | undefined) {
  const { tenant } = useAuthStore();
  const qc = useQueryClient();

  const stateQuery = useQuery({
    queryKey: ['lead_followup_state', leadId],
    queryFn: async (): Promise<LeadFollowUpState | null> => {
      if (!leadId) return null;
      if (!isSupabaseConfigured || !tenant?.id) return MOCK_FOLLOWUP_STATE;

      const { data, error } = await supabase
        .from('lead_followup_state')
        .select('*')
        .eq('lead_id', leadId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!leadId,
    refetchInterval: 60_000, // refresh every minute for countdown accuracy
  });

  const eventsQuery = useQuery({
    queryKey: ['lead_followup_events', leadId],
    queryFn: async (): Promise<FollowUpEvent[]> => {
      if (!leadId || !isSupabaseConfigured || !tenant?.id) return [];

      const { data, error } = await supabase
        .from('follow_up_events')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!leadId && isSupabaseConfigured,
  });

  const pauseMutation = useMutation({
    mutationFn: async ({ paused, reason }: { paused: boolean; reason?: string }) => {
      if (!leadId) return;
      if (!isSupabaseConfigured) return;

      const { error } = await supabase
        .from('lead_followup_state')
        .update({
          paused,
          paused_reason: paused ? (reason ?? 'Manually paused') : null,
          updated_at: new Date().toISOString(),
        })
        .eq('lead_id', leadId);

      if (error) throw error;
    },
    onSuccess: (_, { paused }) => {
      qc.invalidateQueries({ queryKey: ['lead_followup_state', leadId] });
      toast.success(paused ? 'Follow-up sequence paused.' : 'Follow-up sequence resumed.');
    },
  });

  const enqueueNowMutation = useMutation({
    mutationFn: async () => {
      if (!leadId || !tenant?.id) return;
      if (!isSupabaseConfigured) {
        toast.info('Manual trigger works with Supabase connected.');
        return;
      }
      // Trigger the process-followups function for this lead immediately via RPC
      const { error } = await supabase.rpc('enqueue_followup_for_lead', {
        p_lead_id: leadId,
        p_tenant_id: tenant.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lead_followup_state', leadId] });
      toast.success('Lead re-enrolled into follow-up sequence.');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to enqueue follow-up.'),
  });

  return {
    state: stateQuery.data,
    events: eventsQuery.data ?? [],
    isLoading: stateQuery.isLoading,
    pause: (reason?: string) => pauseMutation.mutate({ paused: true, reason }),
    resume: () => pauseMutation.mutate({ paused: false }),
    enqueueNow: enqueueNowMutation.mutate,
    isPausing: pauseMutation.isPending,
    isEnqueuing: enqueueNowMutation.isPending,
  };
}
