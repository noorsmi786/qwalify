-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES & AUTH TRIGGERS
-- Strict multi-tenant isolation based on auth.uid() -> user_profiles.tenant_id
-- ==============================================================================

-- Helper function to fetch current authenticated user's tenant_id with caching
create or replace function public.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id from public.user_profiles where id = auth.uid();
$$;

-- Helper function to check if current user is tenant admin/owner
create or replace function public.is_tenant_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_profiles
    where id = auth.uid() and role in ('owner', 'admin')
  );
$$;

-- Enable RLS across all tables
alter table public.tenants enable row level security;
alter table public.user_profiles enable row level security;
alter table public.leads enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.qualification_scores enable row level security;
alter table public.handoff_events enable row level security;
alter table public.bookings enable row level security;
alter table public.follow_up_sequences enable row level security;
alter table public.follow_up_events enable row level security;
alter table public.consent_log enable row level security;
alter table public.channel_connections enable row level security;

-- 1. TENANTS POLICIES
create policy "Users can view their own tenant"
  on public.tenants for select
  using (id = public.current_tenant_id());

create policy "Owners/admins can update their tenant"
  on public.tenants for update
  using (id = public.current_tenant_id() and public.is_tenant_admin());

-- 2. USER PROFILES POLICIES
create policy "Users can view profiles in their tenant"
  on public.user_profiles for select
  using (tenant_id = public.current_tenant_id());

create policy "Users can update their own profile"
  on public.user_profiles for update
  using (id = auth.uid());

create policy "Admins can manage team profiles"
  on public.user_profiles for all
  using (tenant_id = public.current_tenant_id() and public.is_tenant_admin());

-- 3. LEADS POLICIES
create policy "Tenant users can view leads"
  on public.leads for select
  using (tenant_id = public.current_tenant_id());

create policy "Tenant users can insert leads"
  on public.leads for insert
  with check (tenant_id = public.current_tenant_id());

create policy "Tenant users can update leads"
  on public.leads for update
  using (tenant_id = public.current_tenant_id());

create policy "Tenant users can delete leads"
  on public.leads for delete
  using (tenant_id = public.current_tenant_id() and public.is_tenant_admin());

-- 4. CONVERSATIONS POLICIES
create policy "Tenant users can view conversations"
  on public.conversations for select
  using (tenant_id = public.current_tenant_id());

create policy "Tenant users can manage conversations"
  on public.conversations for all
  using (tenant_id = public.current_tenant_id());

-- 5. MESSAGES POLICIES
create policy "Tenant users can view messages"
  on public.messages for select
  using (tenant_id = public.current_tenant_id());

create policy "Tenant users can insert messages"
  on public.messages for insert
  with check (tenant_id = public.current_tenant_id());

-- 6. QUALIFICATION SCORES POLICIES
create policy "Tenant users can view scores"
  on public.qualification_scores for select
  using (tenant_id = public.current_tenant_id());

create policy "Tenant users can insert scores"
  on public.qualification_scores for insert
  with check (tenant_id = public.current_tenant_id());

-- 7. HANDOFF EVENTS POLICIES
create policy "Tenant users can view handoffs"
  on public.handoff_events for select
  using (tenant_id = public.current_tenant_id());

create policy "Tenant users can manage handoffs"
  on public.handoff_events for all
  using (tenant_id = public.current_tenant_id());

-- 8. BOOKINGS POLICIES
create policy "Tenant users can view bookings"
  on public.bookings for select
  using (tenant_id = public.current_tenant_id());

create policy "Tenant users can manage bookings"
  on public.bookings for all
  using (tenant_id = public.current_tenant_id());

-- 9. FOLLOW UP SEQUENCES POLICIES
create policy "Tenant users can view sequences"
  on public.follow_up_sequences for select
  using (tenant_id = public.current_tenant_id());

create policy "Tenant admins can manage sequences"
  on public.follow_up_sequences for all
  using (tenant_id = public.current_tenant_id() and public.is_tenant_admin());

-- 10. FOLLOW UP EVENTS POLICIES
create policy "Tenant users can view follow-up events"
  on public.follow_up_events for select
  using (tenant_id = public.current_tenant_id());

create policy "Tenant users can manage follow-up events"
  on public.follow_up_events for all
  using (tenant_id = public.current_tenant_id());

-- 11. CONSENT LOG POLICIES
create policy "Tenant users can view consent log"
  on public.consent_log for select
  using (tenant_id = public.current_tenant_id());

create policy "Tenant users can insert consent log"
  on public.consent_log for insert
  with check (tenant_id = public.current_tenant_id());

-- 12. CHANNEL CONNECTIONS POLICIES
create policy "Tenant users can view channels"
  on public.channel_connections for select
  using (tenant_id = public.current_tenant_id());

create policy "Tenant admins can manage channels"
  on public.channel_connections for all
  using (tenant_id = public.current_tenant_id() and public.is_tenant_admin());


-- ==============================================================================
-- AUTOMATIC USER & TENANT PROVISIONING TRIGGER ON SIGNUP
-- ==============================================================================

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_company_name text;
  v_slug text;
  v_full_name text;
begin
  -- Extract metadata or set defaults
  v_company_name := coalesce(new.raw_user_meta_data->>'company_name', 'My Workspace');
  v_full_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
  
  -- Generate unique slug
  v_slug := lower(regexp_replace(v_company_name, '[^a-zA-Z0-9]', '-', 'g'));
  if exists (select 1 from public.tenants where slug = v_slug) then
    v_slug := v_slug || '-' || substr(md5(random()::text), 1, 6);
  end if;

  -- 1. Create Workspace / Tenant
  insert into public.tenants (name, slug)
  values (v_company_name, v_slug)
  returning id into v_tenant_id;

  -- 2. Create User Profile
  insert into public.user_profiles (id, tenant_id, email, full_name, role)
  values (new.id, v_tenant_id, new.email, v_full_name, 'owner');

  -- 3. Provision Default Follow-up Sequence for this Tenant
  insert into public.follow_up_sequences (tenant_id, name, phase1_days, phase2_weeks, cool_after_days, is_default)
  values (v_tenant_id, 'Default Outreach Cadence', 7, 8, 56, true);

  return new;
end;
$$;

-- Drop trigger if exists and recreate
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
