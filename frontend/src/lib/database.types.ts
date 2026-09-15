export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          timezone: string
          plan: 'free' | 'pro' | 'enterprise'
          settings: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          logo_url?: string | null
          timezone?: string
          plan?: 'free' | 'pro' | 'enterprise'
          settings?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          logo_url?: string | null
          timezone?: string
          plan?: 'free' | 'pro' | 'enterprise'
          settings?: Json
          created_at?: string
          updated_at?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          tenant_id: string
          email: string
          full_name: string
          role: 'owner' | 'admin' | 'agent'
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          tenant_id: string
          email: string
          full_name: string
          role?: 'owner' | 'admin' | 'agent'
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          email?: string
          full_name?: string
          role?: 'owner' | 'admin' | 'agent'
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      leads: {
        Row: {
          id: string
          tenant_id: string
          full_name: string
          contact: string
          source_channel: 'whatsapp' | 'telegram' | 'email' | 'slack' | 'manual'
          status: 'new' | 'qualifying' | 'hot' | 'warm' | 'cold' | 'booked' | 'cooled'
          score: number
          assigned_rep_id: string | null
          tags: string[]
          notes: string | null
          external_id: string | null
          is_handoff_ready: boolean
          metadata: Json
          created_at: string
          last_contact_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          full_name: string
          contact: string
          source_channel: 'whatsapp' | 'telegram' | 'email' | 'slack' | 'manual'
          status?: 'new' | 'qualifying' | 'hot' | 'warm' | 'cold' | 'booked' | 'cooled'
          score?: number
          assigned_rep_id?: string | null
          tags?: string[]
          notes?: string | null
          external_id?: string | null
          is_handoff_ready?: boolean
          metadata?: Json
          created_at?: string
          last_contact_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          full_name?: string
          contact?: string
          source_channel?: 'whatsapp' | 'telegram' | 'email' | 'slack' | 'manual'
          status?: 'new' | 'qualifying' | 'hot' | 'warm' | 'cold' | 'booked' | 'cooled'
          score?: number
          assigned_rep_id?: string | null
          tags?: string[]
          notes?: string | null
          external_id?: string | null
          is_handoff_ready?: boolean
          metadata?: Json
          created_at?: string
          last_contact_at?: string
        }
      }
      conversations: {
        Row: {
          id: string
          tenant_id: string
          lead_id: string
          channel: 'whatsapp' | 'telegram' | 'email' | 'slack' | 'manual'
          channel_thread_id: string | null
          state: 'active' | 'paused' | 'closed' | 'handed_off'
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          lead_id: string
          channel: 'whatsapp' | 'telegram' | 'email' | 'slack' | 'manual'
          channel_thread_id?: string | null
          state?: 'active' | 'paused' | 'closed' | 'handed_off'
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          lead_id?: string
          channel?: 'whatsapp' | 'telegram' | 'email' | 'slack' | 'manual'
          channel_thread_id?: string | null
          state?: 'active' | 'paused' | 'closed' | 'handed_off'
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          tenant_id: string
          conversation_id: string
          lead_id: string
          sender: 'lead' | 'ai' | 'human'
          sender_id: string | null
          content: string
          channel: string
          raw_payload: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          conversation_id: string
          lead_id: string
          sender: 'lead' | 'ai' | 'human'
          sender_id?: string | null
          content: string
          channel: string
          raw_payload?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          conversation_id?: string
          lead_id?: string
          sender?: 'lead' | 'ai' | 'human'
          sender_id?: string | null
          content?: string
          channel?: string
          raw_payload?: Json | null
          created_at?: string
        }
      }
      qualification_scores: {
        Row: {
          id: string
          tenant_id: string
          lead_id: string
          score: number
          reason: string | null
          criteria: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          lead_id: string
          score: number
          reason?: string | null
          criteria?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          lead_id?: string
          score?: number
          reason?: string | null
          criteria?: Json | null
          created_at?: string
        }
      }
      handoff_events: {
        Row: {
          id: string
          tenant_id: string
          lead_id: string
          assigned_rep_id: string | null
          trigger_score: number | null
          reason: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          lead_id: string
          assigned_rep_id?: string | null
          trigger_score?: number | null
          reason?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          lead_id?: string
          assigned_rep_id?: string | null
          trigger_score?: number | null
          reason?: string | null
          notes?: string | null
          created_at?: string
        }
      }
      bookings: {
        Row: {
          id: string
          tenant_id: string
          lead_id: string
          scheduled_at: string
          duration_mins: number
          meeting_url: string | null
          status: 'confirmed' | 'cancelled' | 'completed' | 'rescheduled'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          lead_id: string
          scheduled_at: string
          duration_mins?: number
          meeting_url?: string | null
          status?: 'confirmed' | 'cancelled' | 'completed' | 'rescheduled'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          lead_id?: string
          scheduled_at?: string
          duration_mins?: number
          meeting_url?: string | null
          status?: 'confirmed' | 'cancelled' | 'completed' | 'rescheduled'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      follow_up_sequences: {
        Row: {
          id: string
          tenant_id: string
          name: string
          phase1_days: number
          phase1_interval: string
          phase2_weeks: number
          phase2_interval: string
          cool_after_days: number
          is_active: boolean
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name?: string
          phase1_days?: number
          phase1_interval?: string
          phase2_weeks?: number
          phase2_interval?: string
          cool_after_days?: number
          is_active?: boolean
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          name?: string
          phase1_days?: number
          phase1_interval?: string
          phase2_weeks?: number
          phase2_interval?: string
          cool_after_days?: number
          is_active?: boolean
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      follow_up_events: {
        Row: {
          id: string
          tenant_id: string
          lead_id: string
          sequence_id: string
          phase: number
          attempt_number: number
          scheduled_for: string
          sent_at: string | null
          status: 'pending' | 'sent' | 'failed' | 'cancelled' | 'skipped'
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          lead_id: string
          sequence_id: string
          phase: number
          attempt_number: number
          scheduled_for: string
          sent_at?: string | null
          status?: 'pending' | 'sent' | 'failed' | 'cancelled' | 'skipped'
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          lead_id?: string
          sequence_id?: string
          phase?: number
          attempt_number?: number
          scheduled_for?: string
          sent_at?: string | null
          status?: 'pending' | 'sent' | 'failed' | 'cancelled' | 'skipped'
          error_message?: string | null
          created_at?: string
        }
      }
      consent_log: {
        Row: {
          id: string
          tenant_id: string
          lead_id: string
          channel: string
          consent_given: boolean
          consent_text: string | null
          ip_address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          lead_id: string
          channel: string
          consent_given: boolean
          consent_text?: string | null
          ip_address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          lead_id?: string
          channel?: string
          consent_given?: boolean
          consent_text?: string | null
          ip_address?: string | null
          created_at?: string
        }
      }
      channel_connections: {
        Row: {
          id: string
          tenant_id: string
          channel: 'whatsapp' | 'telegram' | 'email' | 'slack'
          status: 'connected' | 'disconnected' | 'error' | 'pending'
          config: Json
          connected_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          channel: 'whatsapp' | 'telegram' | 'email' | 'slack'
          status?: 'connected' | 'disconnected' | 'error' | 'pending'
          config?: Json
          connected_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          channel?: 'whatsapp' | 'telegram' | 'email' | 'slack'
          status?: 'connected' | 'disconnected' | 'error' | 'pending'
          config?: Json
          connected_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: {
      current_tenant_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_tenant_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
  }
}
