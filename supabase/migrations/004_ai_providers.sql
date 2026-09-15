-- ==============================================================================
-- 004_ai_providers.sql
-- Multi-Provider BYOAPI (Bring Your Own API Key) Configuration & Prompts
-- ==============================================================================

create table if not exists public.ai_provider_configs (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants(id) on delete cascade,
  provider      text not null check (provider in ('openai', 'anthropic', 'gemini', 'openrouter', 'groq', 'grok', 'mistral', 'cohere', 'custom')),
  model         text not null,
  api_key       text not null, -- Stored encrypted / scoped per tenant
  custom_endpoint text,        -- For custom OpenAI-compatible / local models
  is_active     boolean not null default false,
  system_prompt text,          -- Custom prompt override if specified
  temperature   numeric not null default 0.3 check (temperature between 0 and 2),
  max_tokens    integer not null default 800,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint unique_tenant_ai_provider unique (tenant_id, provider)
);

create index if not exists idx_ai_provider_tenant on public.ai_provider_configs(tenant_id);
create index if not exists idx_ai_provider_active on public.ai_provider_configs(tenant_id, is_active);

-- Enable RLS
alter table public.ai_provider_configs enable row level security;

-- Policies
create policy "Tenant users can view their AI configs"
  on public.ai_provider_configs for select
  using (tenant_id = public.current_tenant_id());

create policy "Tenant admins can manage their AI configs"
  on public.ai_provider_configs for all
  using (tenant_id = public.current_tenant_id() and public.is_tenant_admin());

-- Seed default demo AI config for Acme Corp (Gemini default in demo mode)
do $$
declare
  v_tenant_id uuid;
begin
  select id into v_tenant_id from public.tenants where slug = 'acme-corp' limit 1;
  if v_tenant_id is not null then
    insert into public.ai_provider_configs (tenant_id, provider, model, api_key, is_active)
    values (v_tenant_id, 'gemini', 'gemini-1.5-flash', 'demo_key_placeholder', true)
    on conflict (tenant_id, provider) do nothing;
  end if;
end $$;
