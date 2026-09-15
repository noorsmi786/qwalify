import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { AIProviderConfig, AIProviderId } from '@/lib/ai/types';
import { AI_PROVIDERS_LIST } from '@/lib/ai/providersMeta';
import { testAIConnection } from '@/lib/ai';
import { toast } from 'sonner';

const STORAGE_KEY = 'qwalify_ai_providers_cache';

export function useAIConfig() {
  const { tenant } = useAuthStore();
  const [configs, setConfigs] = useState<Record<string, AIProviderConfig>>({});
  const [activeProvider, setActiveProvider] = useState<AIProviderId>('gemini');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  // Load configs
  useEffect(() => {
    async function loadConfigs() {
      setIsLoading(true);

      // Local initial defaults
      const initial: Record<string, AIProviderConfig> = {};
      AI_PROVIDERS_LIST.forEach((p) => {
        initial[p.id] = {
          provider: p.id,
          model: p.defaultModel,
          api_key: '',
          is_active: p.id === 'gemini',
          custom_endpoint: p.requiresCustomEndpoint ? 'http://localhost:11434/v1' : undefined,
        };
      });

      // Load cached from localStorage
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          Object.assign(initial, parsed);
        } catch (e) {
          console.warn('Failed to parse cached AI configs:', e);
        }
      }

      // If Supabase is configured, load from DB
      if (isSupabaseConfigured && tenant?.id) {
        const { data, error } = await supabase
          .from('ai_provider_configs')
          .select('*')
          .eq('tenant_id', tenant.id);

        if (!error && data) {
          data.forEach((row: any) => {
            initial[row.provider] = {
              id: row.id,
              tenant_id: row.tenant_id,
              provider: row.provider,
              model: row.model,
              api_key: row.api_key,
              custom_endpoint: row.custom_endpoint,
              is_active: row.is_active,
              system_prompt: row.system_prompt,
            };
            if (row.is_active) {
              setActiveProvider(row.provider);
            }
          });
        }
      }

      setConfigs(initial);
      setIsLoading(false);
    }

    loadConfigs();
  }, [tenant?.id]);

  const saveConfig = async (config: AIProviderConfig) => {
    const updated = { ...configs, [config.provider]: config };
    setConfigs(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    if (isSupabaseConfigured && tenant?.id) {
      await supabase.from('ai_provider_configs').upsert(
        {
          tenant_id: tenant.id,
          provider: config.provider,
          model: config.model,
          api_key: config.api_key,
          custom_endpoint: config.custom_endpoint,
          is_active: config.is_active,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'tenant_id, provider' }
      );
    }
  };

  const setAsActive = async (providerId: AIProviderId) => {
    setActiveProvider(providerId);
    const updated = { ...configs };
    Object.keys(updated).forEach((p) => {
      updated[p] = { ...updated[p], is_active: p === providerId };
    });
    setConfigs(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    if (isSupabaseConfigured && tenant?.id) {
      // Mark all inactive, then mark this active
      await supabase
        .from('ai_provider_configs')
        .update({ is_active: false })
        .eq('tenant_id', tenant.id);

      await supabase
        .from('ai_provider_configs')
        .update({ is_active: true })
        .eq('tenant_id', tenant.id)
        .eq('provider', providerId);
    }
    toast.success(`Active AI provider set to ${providerId.toUpperCase()}`);
  };

  const testProvider = async (config: AIProviderConfig) => {
    if (!config.api_key && config.provider !== 'custom') {
      toast.error('Please enter an API Key first before testing.');
      return;
    }

    setTestingProvider(config.provider);
    const res = await testAIConnection({
      provider: config.provider,
      model: config.model,
      api_key: config.api_key,
      custom_endpoint: config.custom_endpoint,
    });

    setTestingProvider(null);

    if (res.ok) {
      toast.success(res.message);
      await saveConfig(config);
    } else {
      toast.error(res.message);
    }
  };

  return {
    configs,
    activeProvider,
    isLoading,
    testingProvider,
    saveConfig,
    setAsActive,
    testProvider,
  };
}
