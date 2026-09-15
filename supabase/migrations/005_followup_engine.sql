-- ==============================================================================
-- 005_followup_engine.sql
-- Phase 4: User-Configurable Follow-Up Sequence Engine
-- Adds: message templates, per-lead state tracking, pg_cron scheduling
-- ==============================================================================

-- Enable pg_cron (must be enabled in Supabase dashboard under Extensions)
create extension if not exists pg_cron;

-- ─── 1. Add message templates to follow_up_sequences ──────────────────────────
-- Stores user-editable message templates per phase, with variable substitution

alter table public.follow_up_sequences
  add column if not exists phase1_message_template text not null default
    'Hi {{lead_name}} 👋, just following up on our earlier chat about {{company_name}}. Did you get a chance to think it over? I''d love to help answer any questions!',
  add column if not exists phase2_message_template text not null default
    'Hey {{lead_name}}, hope you''re having a great week! Still thinking about {{company_name}}? We''ve helped businesses like yours see real results. Happy to chat when you''re ready 🙌',
  add column if not exists cool_message_template   text not null default
    'Hi {{lead_name}}, we''re wrapping up our outreach for now. If you''re ever ready to explore how {{company_name}} can help, we''re always here. Take care! 👋';

-- ─── 2. Per-Lead Follow-Up State ──────────────────────────────────────────────
-- Tracks each lead's position in the sequence engine independently

create table if not exists public.lead_followup_state (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references public.tenants(id) on delete cascade,
  lead_id             uuid not null references public.leads(id) on delete cascade unique,
  sequence_id         uuid not null references public.follow_up_sequences(id) on delete cascade,
  current_phase       integer not null default 1 check (current_phase in (1, 2, 3)), -- 1=daily, 2=weekly, 3=cooled
  attempt_number      integer not null default 0,         -- total follow-ups sent so far
  phase1_sent         integer not null default 0,         -- follow-ups sent in phase 1
  phase2_sent         integer not null default 0,         -- follow-ups sent in phase 2
  next_followup_at    timestamptz,                        -- next scheduled send time
  last_followup_at    timestamptz,
  paused              boolean not null default false,     -- user can pause anytime
  paused_reason       text,
  started_at          timestamptz not null default now(),
  cooled_at           timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_lfs_tenant        on public.lead_followup_state(tenant_id);
create index if not exists idx_lfs_due           on public.lead_followup_state(next_followup_at)
  where next_followup_at is not null and paused = false;
create index if not exists idx_lfs_phase         on public.lead_followup_state(tenant_id, current_phase);

-- Enable RLS
alter table public.lead_followup_state enable row level security;

create policy "Tenant users can view lead followup state"
  on public.lead_followup_state for select
  using (tenant_id = public.current_tenant_id());

create policy "Tenant admins can manage lead followup state"
  on public.lead_followup_state for all
  using (tenant_id = public.current_tenant_id() and public.is_tenant_admin());

-- ─── 3. Function: enqueue_followup_for_lead ───────────────────────────────────
-- Call this when a lead first goes unresponsive (after AI's first message)

create or replace function public.enqueue_followup_for_lead(
  p_lead_id     uuid,
  p_tenant_id   uuid,
  p_sequence_id uuid default null
)
returns void
language plpgsql
security definer
as $$
declare
  v_seq_id  uuid;
  v_seq     record;
begin
  -- Resolve sequence: use provided, or fetch tenant's default active sequence
  if p_sequence_id is not null then
    v_seq_id := p_sequence_id;
  else
    select id into v_seq_id
    from public.follow_up_sequences
    where tenant_id = p_tenant_id
      and is_active = true
      and is_default = true
    limit 1;
  end if;

  if v_seq_id is null then return; end if;

  select * into v_seq from public.follow_up_sequences where id = v_seq_id;

  -- Create (or reset) the lead's followup state
  insert into public.lead_followup_state (
    tenant_id, lead_id, sequence_id,
    current_phase, attempt_number,
    phase1_sent, phase2_sent,
    next_followup_at, paused
  )
  values (
    p_tenant_id, p_lead_id, v_seq_id,
    1, 0,
    0, 0,
    now() + v_seq.phase1_interval,
    false
  )
  on conflict (lead_id) do update set
    sequence_id      = excluded.sequence_id,
    current_phase    = 1,
    attempt_number   = 0,
    phase1_sent      = 0,
    phase2_sent      = 0,
    next_followup_at = excluded.next_followup_at,
    paused           = false,
    started_at       = now(),
    cooled_at        = null,
    updated_at       = now();
end;
$$;

-- ─── 4. Function: advance_lead_followup ───────────────────────────────────────
-- Called by the Edge Function after a follow-up message is sent

create or replace function public.advance_lead_followup(p_lead_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_state   record;
  v_seq     record;
  v_next_at timestamptz;
  v_result  jsonb;
begin
  select lfs.*, fs.*
  into   v_state
  from   public.lead_followup_state lfs
  join   public.follow_up_sequences fs on fs.id = lfs.sequence_id
  where  lfs.lead_id = p_lead_id;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  -- Phase 1: daily follow-ups
  if v_state.current_phase = 1 then
    if v_state.phase1_sent + 1 >= v_state.phase1_days then
      -- Graduate to phase 2
      update public.lead_followup_state set
        current_phase    = 2,
        phase1_sent      = phase1_sent + 1,
        attempt_number   = attempt_number + 1,
        last_followup_at = now(),
        next_followup_at = now() + v_state.phase2_interval,
        updated_at       = now()
      where lead_id = p_lead_id;
      v_result := jsonb_build_object('status', 'graduated_to_phase2');
    else
      -- Increment and schedule next daily
      update public.lead_followup_state set
        phase1_sent      = phase1_sent + 1,
        attempt_number   = attempt_number + 1,
        last_followup_at = now(),
        next_followup_at = now() + v_state.phase1_interval,
        updated_at       = now()
      where lead_id = p_lead_id;
      v_result := jsonb_build_object('status', 'phase1_continued');
    end if;

  -- Phase 2: weekly follow-ups
  elsif v_state.current_phase = 2 then
    if v_state.phase2_sent + 1 >= v_state.phase2_weeks then
      -- Cooling: no more follow-ups
      update public.lead_followup_state set
        current_phase    = 3,
        phase2_sent      = phase2_sent + 1,
        attempt_number   = attempt_number + 1,
        last_followup_at = now(),
        next_followup_at = null,
        cooled_at        = now(),
        updated_at       = now()
      where lead_id = p_lead_id;
      -- Update lead status to cooled
      update public.leads set status = 'cooled' where id = p_lead_id;
      v_result := jsonb_build_object('status', 'cooled');
    else
      update public.lead_followup_state set
        phase2_sent      = phase2_sent + 1,
        attempt_number   = attempt_number + 1,
        last_followup_at = now(),
        next_followup_at = now() + v_state.phase2_interval,
        updated_at       = now()
      where lead_id = p_lead_id;
      v_result := jsonb_build_object('status', 'phase2_continued');
    end if;

  else
    -- Already cooled / done
    v_result := jsonb_build_object('status', 'already_cooled');
  end if;

  return v_result;
end;
$$;

-- ─── 5. pg_cron Job: Run processor every hour ─────────────────────────────────

select cron.schedule(
  'qwalify-process-followups',      -- job name
  '0 * * * *',                      -- every hour on the hour
  $$
    select net.http_post(
      url    := current_setting('app.supabase_url') || '/functions/v1/process-followups',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_key'),
        'Content-Type', 'application/json'
      ),
      body   := '{}'::jsonb
    );
  $$
);

-- ─── 6. Seed: Default sequence for Acme Corp (demo) ──────────────────────────

do $$
declare
  v_tenant_id uuid;
  v_seq_id    uuid;
begin
  select id into v_tenant_id from public.tenants where slug = 'acme-corp' limit 1;
  if v_tenant_id is not null then
    select id into v_seq_id
    from public.follow_up_sequences
    where tenant_id = v_tenant_id
    limit 1;

    -- Enqueue a sample lead into the follow-up engine
    perform public.enqueue_followup_for_lead(
      (select id from public.leads where tenant_id = v_tenant_id limit 1 offset 3),
      v_tenant_id,
      v_seq_id
    );
  end if;
end $$;
