-- ==============================================================================
-- 007_teams_and_onboarding.sql
-- Phase 7: Multi-Tenant SaaS Shell, Team Management & Onboarding
-- ==============================================================================

-- 1. Add onboarding_completed and usage metrics to tenants
alter table public.tenants
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists monthly_lead_limit integer not null default 500,
  add column if not exists monthly_ai_limit integer not null default 2500;

-- 2. TEAM INVITATIONS TABLE
create table if not exists public.team_invitations (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  email       text not null,
  role        text not null default 'agent' check (role in ('admin', 'agent')),
  token       text unique not null default encode(gen_random_bytes(24), 'hex'),
  invited_by  uuid references public.user_profiles(id) on delete set null,
  status      text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  expires_at  timestamptz not null default (now() + interval '7 days'),
  created_at  timestamptz not null default now(),
  constraint unique_tenant_pending_email unique (tenant_id, email)
);

create index if not exists idx_team_invitations_tenant on public.team_invitations(tenant_id);
create index if not exists idx_team_invitations_token on public.team_invitations(token);

-- Enable RLS
alter table public.team_invitations enable row level security;

create policy "Tenant users can view invitations"
  on public.team_invitations for select
  using (tenant_id = public.current_tenant_id());

create policy "Tenant admins can manage invitations"
  on public.team_invitations for all
  using (tenant_id = public.current_tenant_id() and public.is_tenant_admin());

-- 3. USAGE LOGS TABLE
create table if not exists public.usage_records (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  metric_type text not null check (metric_type in ('lead_created', 'ai_turn', 'message_sent', 'booking_created')),
  amount      integer not null default 1,
  metadata    jsonb not null default '{}'::jsonb,
  recorded_at timestamptz not null default now()
);

create index if not exists idx_usage_records_tenant_date on public.usage_records(tenant_id, recorded_at);

alter table public.usage_records enable row level security;

create policy "Tenant users can view usage records"
  on public.usage_records for select
  using (tenant_id = public.current_tenant_id());

create policy "System service can insert usage records"
  on public.usage_records for insert
  with check (tenant_id = public.current_tenant_id());

-- 4. Set demo tenant onboarding to true
update public.tenants set onboarding_completed = true where slug = 'acme-corp';
