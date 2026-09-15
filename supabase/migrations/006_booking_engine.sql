-- ==============================================================================
-- 006_booking_engine.sql
-- Phase 6: Appointment Booking Engine
-- Adds booking_settings per tenant + availability slots
-- ==============================================================================

-- ─── 1. Booking Settings per Tenant ──────────────────────────────────────────
-- Stores each tenant's booking link and preferences

create table if not exists public.booking_settings (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references public.tenants(id) on delete cascade unique,
  booking_type          text not null default 'link'
    check (booking_type in ('link', 'calendly', 'cal_com', 'custom')),
  booking_url           text,                   -- Calendly / Cal.com / custom link
  meeting_duration_mins integer not null default 30,
  meeting_title         text not null default 'Intro Call — {{company_name}}',
  confirmation_message  text not null default
    '🎉 Amazing! I''ve shared a booking link so you can pick a time that works for you: {{booking_url}} — Looking forward to speaking with you!',
  auto_send_on_handoff  boolean not null default true,  -- send link automatically when score ≥ hot
  hot_score_threshold   integer not null default 75,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table public.booking_settings enable row level security;

create policy "Tenant users can view booking settings"
  on public.booking_settings for select
  using (tenant_id = public.current_tenant_id());

create policy "Tenant admins can manage booking settings"
  on public.booking_settings for all
  using (tenant_id = public.current_tenant_id() and public.is_tenant_admin());

-- ─── 2. Extend bookings table ────────────────────────────────────────────────

alter table public.bookings
  add column if not exists source_channel text,
  add column if not exists booking_link_sent_at timestamptz,
  add column if not exists rep_id uuid references public.user_profiles(id) on delete set null,
  add column if not exists prospect_notes text;

-- ─── 3. Seed demo booking settings for Acme Corp ────────────────────────────

do $$
declare v_tenant_id uuid;
begin
  select id into v_tenant_id from public.tenants where slug = 'acme-corp' limit 1;
  if v_tenant_id is not null then
    insert into public.booking_settings (
      tenant_id, booking_type, booking_url,
      meeting_duration_mins, meeting_title,
      auto_send_on_handoff, hot_score_threshold
    )
    values (
      v_tenant_id, 'calendly',
      'https://calendly.com/your-company/intro-call',
      30, 'Intro Call — Acme Corp',
      true, 75
    )
    on conflict (tenant_id) do nothing;
  end if;
end $$;
