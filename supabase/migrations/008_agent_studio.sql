-- ==============================================================================
-- Migration: 008_agent_studio.sql
-- Description: No-Code AI Workers / Droid Studio schema with industry templates,
--              custom persona tone, business knowledge base, and qualification rules.
-- ==============================================================================

-- 1. Create ai_agents table
CREATE TABLE IF NOT EXISTS public.ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  industry TEXT NOT NULL DEFAULT 'custom', -- dental, real_estate, salon, school, b2b, auto, custom
  avatar_icon TEXT DEFAULT 'Bot',
  tone TEXT DEFAULT 'friendly',            -- warm, professional, direct, casual
  emoji_style TEXT DEFAULT 'subtle',       -- none, subtle, expressive
  language TEXT DEFAULT 'en',
  custom_system_prompt TEXT,
  knowledge_base JSONB DEFAULT '[]'::jsonb, -- Array of { category, question, answer }
  qualification_rules JSONB DEFAULT '[]'::jsonb, -- Array of { id, text, weight, required }
  hot_threshold INT DEFAULT 75,
  warm_threshold INT DEFAULT 45,
  booking_url TEXT,
  meeting_duration_mins INT DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add agent_id to channel_connections
ALTER TABLE public.channel_connections 
ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES public.ai_agents(id) ON DELETE SET NULL;

-- 3. Enable RLS on ai_agents
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for ai_agents
CREATE POLICY "Users can view agents for their tenant"
  ON public.ai_agents FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create agents for their tenant"
  ON public.ai_agents FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.user_profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update agents for their tenant"
  ON public.ai_agents FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete agents for their tenant"
  ON public.ai_agents FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_profiles
      WHERE id = auth.uid()
    )
  );

-- 5. Seed default starter agents for all existing tenants if none exist
DO $$
DECLARE
  t RECORD;
BEGIN
  FOR t IN SELECT id, name FROM public.tenants LOOP
    IF NOT EXISTS (SELECT 1 FROM public.ai_agents WHERE tenant_id = t.id) THEN
      -- Default Sales SDR
      INSERT INTO public.ai_agents (
        tenant_id,
        name,
        industry,
        avatar_icon,
        tone,
        emoji_style,
        knowledge_base,
        qualification_rules,
        hot_threshold,
        booking_url,
        is_active
      ) VALUES (
        t.id,
        'Lead Qualification SDR',
        'b2b',
        'Zap',
        'friendly',
        'subtle',
        '[
          {"category": "About", "question": "What does our company do?", "answer": "We provide premier automated business solutions."},
          {"category": "Hours", "question": "What are your business hours?", "answer": "Monday to Friday, 9 AM to 6 PM EST."}
        ]'::jsonb,
        '[
          {"id": "q1", "text": "What is your biggest business challenge right now?", "weight": 25, "required": true},
          {"id": "q2", "text": "What is your estimated team or company size?", "weight": 20, "required": true},
          {"id": "q3", "text": "What is your target timeline and budget range?", "weight": 35, "required": true}
        ]'::jsonb,
        75,
        'https://calendly.com/demo/intro',
        true
      );
    END IF;
  END LOOP;
END $$;
