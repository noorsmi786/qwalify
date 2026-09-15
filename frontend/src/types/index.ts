// Core types for Qwalify — all records scoped to tenant_id (Phase 2 will enforce via RLS)

export type LeadStatus =
  | 'new'
  | 'qualifying'
  | 'hot'
  | 'warm'
  | 'cold'
  | 'booked'
  | 'cooled';

export type ChannelType = 'whatsapp' | 'telegram' | 'email' | 'slack' | 'manual';

export type MessageSender = 'lead' | 'ai' | 'human';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  timezone: string;
  plan?: 'free' | 'pro' | 'enterprise';
  onboarding_completed?: boolean;
  created_at: string;
}

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: 'owner' | 'admin' | 'agent';
}

export interface Lead {
  id: string;
  tenant_id: string;
  full_name: string;
  contact: string; // phone or email
  source_channel: ChannelType;
  status: LeadStatus;
  score: number; // 0–100
  assigned_rep?: string;
  tags: string[];
  notes?: string;
  created_at: string;
  last_contact_at: string;
  is_handoff_ready: boolean;
}

export interface ScoreHistory {
  date: string;
  score: number;
}

export interface Message {
  id: string;
  lead_id: string;
  tenant_id: string;
  sender: MessageSender;
  content: string;
  created_at: string;
  channel: ChannelType;
}

export interface ActivityEvent {
  id: string;
  tenant_id: string;
  type:
    | 'lead_created'
    | 'status_changed'
    | 'score_updated'
    | 'booking_made'
    | 'handoff_triggered'
    | 'follow_up_sent';
  description: string;
  lead_name: string;
  created_at: string;
}

export interface DashboardStats {
  total_leads: number;
  hot_leads: number;
  bookings_this_month: number;
  response_rate: number;
  leads_trend: { date: string; count: number }[];
  status_breakdown: { status: LeadStatus; count: number }[];
  channel_breakdown: { channel: ChannelType; count: number }[];
}
