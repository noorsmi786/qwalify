import { useState, useCallback, useRef } from 'react';
import { fetchProviderModels, type FetchedModel } from '@/lib/ai/fetchModels';
import type { AIProviderId } from '@/lib/ai/types';
import { AI_PROVIDERS_LIST } from '@/lib/ai/providersMeta';

export type ModelFetchStatus = 'idle' | 'loading' | 'success' | 'error';

export interface ModelFetchState {
  models: FetchedModel[];
  status: ModelFetchStatus;
  errorMsg: string | null;
}

/**
 * Manages per-provider dynamic model fetching.
 * Call `triggerFetch(provider, apiKey, customEndpoint)` after key input.
 * Falls back gracefully to the static providersMeta list.
 */
export function useDynamicModels() {
  const [fetchStates, setFetchStates] = useState<Record<string, ModelFetchState>>({});
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const getState = (provider: AIProviderId): ModelFetchState =>
    fetchStates[provider] ?? { models: [], status: 'idle', errorMsg: null };

  const getFallbackModels = (provider: AIProviderId): FetchedModel[] => {
    const meta = AI_PROVIDERS_LIST.find((p) => p.id === provider);
    return (meta?.availableModels ?? []).map((m) => ({
      id: m.id,
      name: m.name,
      tag: m.tag,
    }));
  };

  /**
   * Returns the models to display: dynamic ones if available, else static fallback.
   */
  const getModels = (provider: AIProviderId): FetchedModel[] => {
    const state = getState(provider);
    if (state.models.length > 0) return state.models;
    return getFallbackModels(provider);
  };

  /**
   * Debounced trigger — waits 700ms after last call before hitting the API.
   * Safe to call on every keystroke of the API key field.
   */
  const triggerFetch = useCallback(
    (provider: AIProviderId, apiKey: string, customEndpoint?: string) => {
      // Clear any pending debounce for this provider
      clearTimeout(debounceTimers.current[provider]);

      // Need at least a minimal key length before attempting fetch
      const minKeyLen: Record<AIProviderId, number> = {
        openai: 20,
        anthropic: 20,
        gemini: 20,
        openrouter: 20,
        groq: 20,
        grok: 10,
        mistral: 10,
        cohere: 10,
        custom: 0,
      };

      if (!apiKey || apiKey.length < (minKeyLen[provider] ?? 10)) {
        // Key too short — reset to idle so provider shows static list
        setFetchStates((prev) => ({
          ...prev,
          [provider]: { models: [], status: 'idle', errorMsg: null },
        }));
        return;
      }

      // Set loading immediately for responsive UI
      setFetchStates((prev) => ({
        ...prev,
        [provider]: { models: prev[provider]?.models ?? [], status: 'loading', errorMsg: null },
      }));

      debounceTimers.current[provider] = setTimeout(async () => {
        try {
          const models = await fetchProviderModels(provider, apiKey, customEndpoint);

          if (models.length === 0) {
            // Successful API call but no usable models → treat as soft error
            setFetchStates((prev) => ({
              ...prev,
              [provider]: {
                models: [],
                status: 'error',
                errorMsg: 'No chat models found for this key. Showing default list.',
              },
            }));
          } else {
            setFetchStates((prev) => ({
              ...prev,
              [provider]: { models, status: 'success', errorMsg: null },
            }));
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          setFetchStates((prev) => ({
            ...prev,
            [provider]: { models: [], status: 'error', errorMsg: message },
          }));
        }
      }, 700);
    },
    []
  );

  const clearFetch = useCallback((provider: AIProviderId) => {
    clearTimeout(debounceTimers.current[provider]);
    setFetchStates((prev) => ({
      ...prev,
      [provider]: { models: [], status: 'idle', errorMsg: null },
    }));
  }, []);

  return { getState, getModels, triggerFetch, clearFetch };
}
