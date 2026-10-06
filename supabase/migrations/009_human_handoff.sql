-- ==============================================================================
-- 009_HUMAN_HANDOFF.SQL - Qwalify Human Handoff & Rep Notification Engine
-- ==============================================================================

-- 1. Extend handoff_events table with status, conversation_id, resolved_at, summary
ALTER TABLE IF EXISTS public.handoff_events 
  ADD COLUMN IF NOT EXISTS conversation_id uuid,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'resolved')),
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS rep_chat_id text;

CREATE INDEX IF NOT EXISTS idx_handoff_status ON public.handoff_events(tenant_id, status);

-- 2. Add bot_paused column to leads
ALTER TABLE IF EXISTS public.leads 
  ADD COLUMN IF NOT EXISTS bot_paused boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_leads_bot_paused ON public.leads(tenant_id, bot_paused);

-- 3. Create rep_settings table for notification channels
CREATE TABLE IF NOT EXISTS public.rep_settings (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  rep_id               uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  notification_channel text NOT NULL DEFAULT 'telegram' CHECK (notification_channel IN ('telegram', 'whatsapp', 'slack')),
  notification_handle  text NOT NULL, -- Telegram Chat ID, WhatsApp phone, Slack ID
  bot_token            text,          -- Optional custom bot token per rep/tenant
  is_active            boolean NOT NULL DEFAULT true,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rep_settings_tenant ON public.rep_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rep_settings_channel ON public.rep_settings(tenant_id, notification_channel);

-- Enable RLS
ALTER TABLE public.rep_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their tenant rep settings"
  ON public.rep_settings
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );
