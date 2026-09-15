-- ==============================================================================
-- QWALIFY SAAS DATABASE SCHEMA
-- Multi-Tenant Lead Qualification, Outreach & Booking Platform
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 1. TENANTS (Workspaces)
create table if not exists public.tenants (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique not null,
  logo_url    text,
  timezone    text not null default 'UTC',
  plan        text not null default 'free' check (plan in ('free', 'pro', 'enterprise')),
  settings    jsonb not null default '{"qualification_thresholds": {"hot": 75, "warm": 45}}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_tenants_slug on public.tenants(slug);

-- 2. USER PROFILES (Extends auth.users 1:1)
create table if not exists public.user_profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  email       text not null,
  full_name   text not null,
  role        text not null default 'agent' check (role in ('owner', 'admin', 'agent')),
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_user_profiles_tenant on public.user_profiles(tenant_id);

-- 3. LEADS (Main Pipeline Entity)
create table if not exists public.leads (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenants(id) on delete cascade,
  full_name         text not null,
  contact           text not null,
  source_channel    text not null check (source_channel in ('whatsapp', 'telegram', 'email', 'slack', 'manual')),
  status            text not null default 'new' check (status in ('new', 'qualifying', 'hot', 'warm', 'cold', 'booked', 'cooled')),
  score             integer not null default 0 check (score between 0 and 100),
  assigned_rep_id   uuid references public.user_profiles(id) on delete set null,
  tags              text[] not null default '{}',
  notes             text,
  external_id       text, -- External chat/user identifier (e.g. WhatsApp phone/JID)
  is_handoff_ready  boolean not null default false,
  metadata          jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  last_contact_at   timestamptz not null default now(),
  constraint unique_tenant_lead_contact unique (tenant_id, contact)
);

create index if not exists idx_leads_tenant on public.leads(tenant_id);
create index if not exists idx_leads_status on public.leads(tenant_id, status);
create index if not exists idx_leads_score on public.leads(tenant_id, score desc);
create index if not exists idx_leads_last_contact on public.leads(tenant_id, last_contact_at desc);

-- 4. CONVERSATIONS (Thread session per lead/channel)
create table if not exists public.conversations (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null references public.tenants(id) on delete cascade,
  lead_id            uuid not null references public.leads(id) on delete cascade,
  channel            text not null check (channel in ('whatsapp', 'telegram', 'email', 'slack', 'manual')),
  channel_thread_id  text,
  state              text not null default 'active' check (state in ('active', 'paused', 'closed', 'handed_off')),
  metadata           jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint unique_lead_channel_conversation unique (lead_id, channel)
);

create index if not exists idx_conversations_tenant on public.conversations(tenant_id);
create index if not exists idx_conversations_lead on public.conversations(lead_id);

-- 5. MESSAGES (Full Chat History)
create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  lead_id         uuid not null references public.leads(id) on delete cascade,
  sender          text not null check (sender in ('lead', 'ai', 'human')),
  sender_id       uuid references public.user_profiles(id) on delete set null,
  content         text not null,
  channel         text not null,
  raw_payload     jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists idx_messages_conversation on public.messages(conversation_id, created_at asc);
create index if not exists idx_messages_lead on public.messages(lead_id, created_at asc);
create index if not exists idx_messages_tenant on public.messages(tenant_id);

-- 6. QUALIFICATION SCORES (Timeline & Progression)
create table if not exists public.qualification_scores (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  lead_id     uuid not null references public.leads(id) on delete cascade,
  score       integer not null check (score between 0 and 100),
  reason      text,
  criteria    jsonb default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists idx_scores_lead on public.qualification_scores(lead_id, created_at asc);

-- 7. HANDOFF EVENTS (AI to Human Escalation Log)
create table if not exists public.handoff_events (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  lead_id         uuid not null references public.leads(id) on delete cascade,
  assigned_rep_id uuid references public.user_profiles(id) on delete set null,
  trigger_score   integer,
  reason          text,
  notes           text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_handoff_tenant on public.handoff_events(tenant_id);
create index if not exists idx_handoff_lead on public.handoff_events(lead_id);

-- 8. BOOKINGS (Appointments & Demos)
create table if not exists public.bookings (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  lead_id         uuid not null references public.leads(id) on delete cascade,
  scheduled_at    timestamptz not null,
  duration_mins   integer not null default 30,
  meeting_url     text,
  status          text not null default 'confirmed' check (status in ('confirmed', 'cancelled', 'completed', 'rescheduled')),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_bookings_tenant on public.bookings(tenant_id);
create index if not exists idx_bookings_lead on public.bookings(lead_id);

-- 9. FOLLOW-UP SEQUENCES & EVENTS (Cadence Engine)
create table if not exists public.follow_up_sequences (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references public.tenants(id) on delete cascade,
  name             text not null default 'Default Cadence',
  phase1_days      integer not null default 7,     -- daily follow-up days
  phase1_interval  interval not null default '1 day'::interval,
  phase2_weeks     integer not null default 8,     -- weekly follow-up weeks
  phase2_interval  interval not null default '7 days'::interval,
  cool_after_days  integer not null default 56,    -- 8 weeks total
  is_active        boolean not null default true,
  is_default       boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_sequences_tenant on public.follow_up_sequences(tenant_id);

create table if not exists public.follow_up_events (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  lead_id         uuid not null references public.leads(id) on delete cascade,
  sequence_id     uuid not null references public.follow_up_sequences(id) on delete cascade,
  phase           integer not null check (phase in (1, 2)),
  attempt_number  integer not null,
  scheduled_for   timestamptz not null,
  sent_at         timestamptz,
  status          text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'cancelled', 'skipped')),
  error_message   text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_followup_events_tenant on public.follow_up_events(tenant_id);
create index if not exists idx_followup_events_lead on public.follow_up_events(lead_id);
create index if not exists idx_followup_events_status on public.follow_up_events(status, scheduled_for);

-- 10. CONSENT LOG (GDPR & Messaging Compliance)
create table if not exists public.consent_log (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  lead_id         uuid not null references public.leads(id) on delete cascade,
  channel         text not null,
  consent_given   boolean not null,
  consent_text    text,
  ip_address      text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_consent_tenant on public.consent_log(tenant_id);

-- 11. CHANNEL CONNECTIONS (Credentials & Adapters)
create table if not exists public.channel_connections (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  channel      text not null check (channel in ('whatsapp', 'telegram', 'email', 'slack')),
  status       text not null default 'disconnected' check (status in ('connected', 'disconnected', 'error', 'pending')),
  config       jsonb not null default '{}'::jsonb, -- instance credentials/tokens
  connected_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint unique_tenant_channel unique (tenant_id, channel)
);

create index if not exists idx_channels_tenant on public.channel_connections(tenant_id);
