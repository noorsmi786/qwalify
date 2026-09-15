import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

export interface TeamMember {
  id: string;
  email: string;
  full_name: string;
  role: 'owner' | 'admin' | 'agent';
  avatar_url?: string | null;
  created_at: string;
}

export interface TeamInvitation {
  id: string;
  email: string;
  role: 'admin' | 'agent';
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  token: string;
  created_at: string;
  expires_at: string;
}

const MOCK_MEMBERS: TeamMember[] = [
  {
    id: 'usr-1',
    email: 'alex@acme.corp',
    full_name: 'Alex Mercer',
    role: 'owner',
    created_at: '2026-01-15T10:00:00Z',
  },
  {
    id: 'usr-2',
    email: 'sarah.j@acme.corp',
    full_name: 'Sarah Jenkins',
    role: 'admin',
    created_at: '2026-02-01T14:30:00Z',
  },
  {
    id: 'usr-3',
    email: 'david.k@acme.corp',
    full_name: 'David Kim',
    role: 'agent',
    created_at: '2026-02-18T09:15:00Z',
  },
];

const MOCK_INVITATIONS: TeamInvitation[] = [
  {
    id: 'inv-1',
    email: 'emily.rep@acme.corp',
    role: 'agent',
    status: 'pending',
    token: 'inv_mock_token_123',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export function useTeamData() {
  const { tenant } = useAuthStore();
  const qc = useQueryClient();

  const membersQuery = useQuery({
    queryKey: ['team_members', tenant?.id],
    queryFn: async (): Promise<TeamMember[]> => {
      if (!isSupabaseConfigured || !tenant?.id) return MOCK_MEMBERS;

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const invitationsQuery = useQuery({
    queryKey: ['team_invitations', tenant?.id],
    queryFn: async (): Promise<TeamInvitation[]> => {
      if (!isSupabaseConfigured || !tenant?.id) return MOCK_INVITATIONS;

      const { data, error } = await supabase
        .from('team_invitations')
        .select('*')
        .eq('tenant_id', tenant.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });

  const inviteMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: 'admin' | 'agent' }) => {
      if (!isSupabaseConfigured || !tenant?.id) {
        return { email, role };
      }

      const { data, error } = await supabase
        .from('team_invitations')
        .insert({
          tenant_id: tenant.id,
          email,
          role,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['team_invitations', tenant?.id] });
      toast.success(`Invitation link generated for ${vars.email}`);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to send invite.');
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      if (!isSupabaseConfigured || !tenant?.id) return;

      const { error } = await supabase
        .from('team_invitations')
        .update({ status: 'revoked' })
        .eq('id', invitationId);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team_invitations', tenant?.id] });
      toast.success('Invitation revoked.');
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: 'admin' | 'agent' }) => {
      if (!isSupabaseConfigured) return;

      const { error } = await supabase
        .from('user_profiles')
        .update({ role, updated_at: new Date().toISOString() })
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team_members', tenant?.id] });
      toast.success('Member role updated.');
    },
  });

  return {
    members: membersQuery.data ?? MOCK_MEMBERS,
    invitations: invitationsQuery.data ?? MOCK_INVITATIONS,
    isLoading: membersQuery.isLoading || invitationsQuery.isLoading,
    inviteMember: inviteMutation.mutate,
    isInviting: inviteMutation.isPending,
    revokeInvitation: revokeMutation.mutate,
    updateRole: updateRoleMutation.mutate,
  };
}
