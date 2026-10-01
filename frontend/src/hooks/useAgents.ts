import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import type { AIAgent, IndustryType } from '@/types/agent';
import { INDUSTRY_TEMPLATES } from '@/lib/ai/industryTemplates';
import { toast } from 'sonner';

const DEFAULT_STARTER_AGENTS: AIAgent[] = [
  {
    id: 'agent_dental_starter',
    tenant_id: 'default',
    name: 'Dr. Smile Clinic Triage',
    industry: 'dental',
    avatar_icon: 'Activity',
    tone: 'empathetic',
    emoji_style: 'subtle',
    language: 'en',
    knowledge_base: INDUSTRY_TEMPLATES.dental.suggestedKnowledge,
    qualification_rules: INDUSTRY_TEMPLATES.dental.suggestedQuestions,
    hot_threshold: 75,
    warm_threshold: 45,
    booking_url: INDUSTRY_TEMPLATES.dental.defaultBookingUrl,
    meeting_duration_mins: 30,
    is_active: false,
    created_at: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
  },
  {
    id: 'agent_re_starter',
    tenant_id: 'default',
    name: 'Skyline Luxury Realty Agent',
    industry: 'real_estate',
    avatar_icon: 'Building2',
    tone: 'professional',
    emoji_style: 'subtle',
    language: 'en',
    knowledge_base: INDUSTRY_TEMPLATES.real_estate.suggestedKnowledge,
    qualification_rules: INDUSTRY_TEMPLATES.real_estate.suggestedQuestions,
    hot_threshold: 75,
    warm_threshold: 45,
    booking_url: INDUSTRY_TEMPLATES.real_estate.defaultBookingUrl,
    meeting_duration_mins: 45,
    is_active: false,
    created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
  },
  {
    id: 'agent_b2b_starter',
    tenant_id: 'default',
    name: 'Growth SDR Assistant',
    industry: 'b2b',
    avatar_icon: 'Zap',
    tone: 'professional',
    emoji_style: 'subtle',
    language: 'en',
    knowledge_base: INDUSTRY_TEMPLATES.b2b.suggestedKnowledge,
    qualification_rules: INDUSTRY_TEMPLATES.b2b.suggestedQuestions,
    hot_threshold: 75,
    warm_threshold: 45,
    booking_url: INDUSTRY_TEMPLATES.b2b.defaultBookingUrl,
    meeting_duration_mins: 15,
    is_active: true,
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'agent_salon_starter',
    tenant_id: 'default',
    name: 'Velvet Salon Concierge',
    industry: 'salon',
    avatar_icon: 'Sparkles',
    tone: 'casual',
    emoji_style: 'expressive',
    language: 'en',
    knowledge_base: INDUSTRY_TEMPLATES.salon.suggestedKnowledge,
    qualification_rules: INDUSTRY_TEMPLATES.salon.suggestedQuestions,
    hot_threshold: 70,
    warm_threshold: 40,
    booking_url: INDUSTRY_TEMPLATES.salon.defaultBookingUrl,
    meeting_duration_mins: 30,
    is_active: false,
    created_at: new Date().toISOString(),
  },
];

export function useAgents() {
  const { tenant } = useAuthStore();
  const [agents, setAgents] = useState<AIAgent[]>(() => {
    const saved = localStorage.getItem(`qwalify_agents_${tenant?.id || 'default'}`);
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return DEFAULT_STARTER_AGENTS;
  });
  const [isLoading, setIsLoading] = useState(false);

  // Sync to local storage for persistence backup
  const persistLocally = (updated: AIAgent[]) => {
    setAgents(updated);
    localStorage.setItem(`qwalify_agents_${tenant?.id || 'default'}`, JSON.stringify(updated));
  };

  const fetchAgents = useCallback(async () => {
    if (!isSupabaseConfigured || !tenant?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_agents')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        setAgents(data as AIAgent[]);
        localStorage.setItem(`qwalify_agents_${tenant.id}`, JSON.stringify(data));
      }
    } catch {
      // Fallback seamlessly to local / starter agents
    } finally {
      setIsLoading(false);
    }
  }, [tenant?.id]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const createAgent = async (agentData: Partial<AIAgent> & { industry: IndustryType }) => {
    const template = INDUSTRY_TEMPLATES[agentData.industry];
    const newAgent: AIAgent = {
      id: 'agent_' + Math.random().toString(36).substring(2, 9),
      tenant_id: tenant?.id || 'default',
      name: agentData.name || template.name,
      industry: agentData.industry,
      avatar_icon: agentData.avatar_icon || template.icon,
      tone: agentData.tone || template.defaultTone,
      emoji_style: agentData.emoji_style || template.defaultEmoji,
      language: agentData.language || 'en',
      custom_system_prompt: agentData.custom_system_prompt || '',
      knowledge_base: agentData.knowledge_base || template.suggestedKnowledge,
      qualification_rules: agentData.qualification_rules || template.suggestedQuestions,
      hot_threshold: agentData.hot_threshold || 75,
      warm_threshold: agentData.warm_threshold || 45,
      booking_url: agentData.booking_url || template.defaultBookingUrl,
      meeting_duration_mins: agentData.meeting_duration_mins || 30,
      is_active: agentData.is_active ?? false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updated = [newAgent, ...agents];
    persistLocally(updated);

    if (isSupabaseConfigured && tenant?.id) {
      try {
        await supabase.from('ai_agents').insert({
          ...newAgent,
          tenant_id: tenant.id,
        });
      } catch (e) {
        console.warn('Supabase ai_agents insert notice:', e);
      }
      try {
        const active = updated.find((a) => a.is_active) || null;
        await supabase.from('tenants').update({
          settings: {
            ...((tenant as any)?.settings || {}),
            agents: updated,
            active_agent: active,
          },
        }).eq('id', tenant.id);
      } catch (e) {
        console.warn('Supabase tenant settings agent sync notice:', e);
      }
    }

    toast.success(`Created agent "${newAgent.name}"!`);
    return newAgent;
  };

  const updateAgent = async (agentId: string, updates: Partial<AIAgent>) => {
    const updated = agents.map((a) =>
      a.id === agentId ? { ...a, ...updates, updated_at: new Date().toISOString() } : a
    );
    persistLocally(updated);

    if (isSupabaseConfigured && tenant?.id) {
      try {
        await supabase
          .from('ai_agents')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', agentId)
          .eq('tenant_id', tenant.id);
      } catch (e) {
        console.warn('Supabase agent update notice:', e);
      }
      try {
        const active = updated.find((a) => a.is_active) || null;
        await supabase.from('tenants').update({
          settings: {
            ...((tenant as any)?.settings || {}),
            agents: updated,
            active_agent: active,
          },
        }).eq('id', tenant.id);
      } catch (e) {
        console.warn('Supabase tenant settings agent sync notice:', e);
      }
    }

    toast.success('Worker settings saved successfully!');
  };

  const deleteAgent = async (agentId: string) => {
    const updated = agents.filter((a) => a.id !== agentId);
    persistLocally(updated);

    if (isSupabaseConfigured && tenant?.id) {
      try {
        await supabase.from('ai_agents').delete().eq('id', agentId).eq('tenant_id', tenant.id);
      } catch (e) {
        console.warn('Supabase agent delete notice:', e);
      }
      try {
        const active = updated.find((a) => a.is_active) || null;
        await supabase.from('tenants').update({
          settings: {
            ...((tenant as any)?.settings || {}),
            agents: updated,
            active_agent: active,
          },
        }).eq('id', tenant.id);
      } catch (e) {
        console.warn('Supabase tenant settings agent sync notice:', e);
      }
    }

    toast.success('Agent removed');
  };

  const toggleActiveAgent = async (agentId: string) => {
    const target = agents.find((a) => a.id === agentId);
    if (!target) return;

    // Toggle active state; if activating this one, pause others
    const willBeActive = !target.is_active;
    const updated = agents.map((a) =>
      a.id === agentId
        ? { ...a, is_active: willBeActive }
        : willBeActive
        ? { ...a, is_active: false }
        : a
    );
    persistLocally(updated);

    if (isSupabaseConfigured && tenant?.id) {
      try {
        await supabase
          .from('ai_agents')
          .update({ is_active: willBeActive })
          .eq('id', agentId)
          .eq('tenant_id', tenant.id);
      } catch (e) {
        console.warn('Supabase agent active toggle notice:', e);
      }
      try {
        const active = updated.find((a) => a.is_active) || null;
        await supabase.from('tenants').update({
          settings: {
            ...((tenant as any)?.settings || {}),
            agents: updated,
            active_agent: active,
          },
        }).eq('id', tenant.id);
      } catch (e) {
        console.warn('Supabase tenant settings agent sync notice:', e);
      }
    }

    toast.info(`Agent "${target.name}" is now ${willBeActive ? 'Active 🟢' : 'Paused ⏸️'}`);
  };

  return {
    agents,
    isLoading,
    createAgent,
    updateAgent,
    deleteAgent,
    toggleActiveAgent,
    refreshAgents: fetchAgents,
  };
}
