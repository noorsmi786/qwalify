import { useQuery } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { mockStats } from '@/mock';
import type { DashboardStats, LeadStatus, ChannelType } from '@/types';

export function useDashboardData() {
  const { tenant } = useAuthStore();

  return useQuery({
    queryKey: ['dashboard_stats', tenant?.id],
    queryFn: async (): Promise<DashboardStats> => {
      if (!isSupabaseConfigured || !tenant?.id) {
        return mockStats;
      }

      // Fetch all leads for this tenant
      const { data: leads, error } = await supabase
        .from('leads')
        .select('*')
        .eq('tenant_id', tenant.id);

      if (error || !leads) {
        return mockStats;
      }

      const totalLeads = leads.length;
      const hotLeads = leads.filter((l) => l.status === 'hot').length;
      const bookedLeads = leads.filter((l) => l.status === 'booked').length;

      // Status breakdown
      const statuses: LeadStatus[] = ['new', 'qualifying', 'hot', 'warm', 'cold', 'booked', 'cooled'];
      const statusBreakdown = statuses.map((status) => ({
        status,
        count: leads.filter((l) => l.status === status).length,
      }));

      // Channel breakdown
      const channels: ChannelType[] = ['whatsapp', 'telegram', 'email', 'slack', 'manual'];
      const channelBreakdown = channels
        .map((channel) => ({
          channel,
          count: leads.filter((l) => l.source_channel === channel).length,
        }))
        .filter((c) => c.count > 0);

      // Bookings count from bookings table
      const { count: bookingsCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant.id);

      return {
        total_leads: totalLeads,
        hot_leads: hotLeads,
        bookings_this_month: bookingsCount ?? bookedLeads,
        response_rate: totalLeads > 0 ? Math.round(((totalLeads - leads.filter((l) => l.status === 'new').length) / totalLeads) * 100) : 0,
        leads_trend: mockStats.leads_trend,
        status_breakdown: statusBreakdown,
        channel_breakdown: channelBreakdown.length > 0 ? channelBreakdown : mockStats.channel_breakdown,
      };
    },
    initialData: mockStats,
  });
}
