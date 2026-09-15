import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BookingSettings {
  id?: string;
  tenant_id?: string;
  booking_type: 'link' | 'calendly' | 'cal_com' | 'custom';
  booking_url: string;
  meeting_duration_mins: number;
  meeting_title: string;
  confirmation_message: string;
  auto_send_on_handoff: boolean;
  hot_score_threshold: number;
}

export interface Booking {
  id: string;
  tenant_id: string;
  lead_id: string;
  scheduled_at: string;
  duration_mins: number;
  meeting_url: string | null;
  status: 'confirmed' | 'cancelled' | 'completed' | 'rescheduled';
  notes: string | null;
  source_channel: string | null;
  lead?: {
    full_name: string;
    contact: string;
    source_channel: string;
    score: number;
  };
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_SETTINGS: BookingSettings = {
  booking_type: 'calendly',
  booking_url: 'https://calendly.com/your-company/intro-call',
  meeting_duration_mins: 30,
  meeting_title: 'Intro Call — Acme Corp',
  confirmation_message:
    "🎉 Amazing! I've shared a booking link so you can pick a time that works for you: {{booking_url}} — Looking forward to speaking with you!",
  auto_send_on_handoff: true,
  hot_score_threshold: 75,
};

const MOCK_BOOKINGS: Booking[] = [
  {
    id: 'book-1',
    tenant_id: 'tenant-mock',
    lead_id: 'lead-1',
    scheduled_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    duration_mins: 30,
    meeting_url: 'https://meet.google.com/abc-def-ghi',
    status: 'confirmed',
    notes: null,
    source_channel: 'whatsapp',
    lead: { full_name: 'Sarah Mitchell', contact: '+1 (555) 019-2831', source_channel: 'whatsapp', score: 88 },
  },
  {
    id: 'book-2',
    tenant_id: 'tenant-mock',
    lead_id: 'lead-2',
    scheduled_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    duration_mins: 30,
    meeting_url: null,
    status: 'confirmed',
    notes: 'Requested evening slot',
    source_channel: 'telegram',
    lead: { full_name: 'Marcus Chen', contact: '@marcusc', source_channel: 'telegram', score: 79 },
  },
  {
    id: 'book-3',
    tenant_id: 'tenant-mock',
    lead_id: 'lead-3',
    scheduled_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    duration_mins: 30,
    meeting_url: 'https://meet.google.com/xyz-123',
    status: 'completed',
    notes: null,
    source_channel: 'whatsapp',
    lead: { full_name: 'Elena Rodriguez', contact: '+1 (555) 234-5678', source_channel: 'whatsapp', score: 92 },
  },
];

// ─── Hook: Booking Settings ───────────────────────────────────────────────────

export function useBookingSettings() {
  const { tenant } = useAuthStore();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['booking_settings', tenant?.id],
    queryFn: async (): Promise<BookingSettings> => {
      if (!isSupabaseConfigured || !tenant?.id) return MOCK_SETTINGS;

      const { data, error } = await supabase
        .from('booking_settings')
        .select('*')
        .eq('tenant_id', tenant.id)
        .maybeSingle();

      if (error) throw error;
      return data ?? MOCK_SETTINGS;
    },
    staleTime: 30_000,
  });

  const saveMutation = useMutation({
    mutationFn: async (updates: BookingSettings) => {
      if (!isSupabaseConfigured || !tenant?.id) return updates;

      const { error } = await supabase
        .from('booking_settings')
        .upsert({ tenant_id: tenant.id, ...updates, updated_at: new Date().toISOString() },
          { onConflict: 'tenant_id' });

      if (error) throw error;
      return updates;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['booking_settings', tenant?.id] });
      toast.success('Booking settings saved successfully.');
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to save booking settings.'),
  });

  return {
    settings: query.data ?? MOCK_SETTINGS,
    isLoading: query.isLoading,
    saveSettings: saveMutation.mutate,
    isSaving: saveMutation.isPending,
  };
}

// ─── Hook: Bookings List ──────────────────────────────────────────────────────

export function useBookings() {
  const { tenant } = useAuthStore();

  return useQuery({
    queryKey: ['bookings', tenant?.id],
    queryFn: async (): Promise<Booking[]> => {
      if (!isSupabaseConfigured || !tenant?.id) return MOCK_BOOKINGS;

      const { data, error } = await supabase
        .from('bookings')
        .select('*, lead:leads(full_name, contact, source_channel, score)')
        .eq('tenant_id', tenant.id)
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 60_000,
  });
}
