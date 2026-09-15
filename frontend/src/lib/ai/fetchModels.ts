import type { AIProviderId } from './types';

export interface FetchedModel {
  id: string;
  name: string;
  tag?: string;
  context_length?: number;
  is_free?: boolean;
}

/**
 * Fetches available models from the provider's API using the given key.
 * Falls back to an empty array on failure — the calling layer should handle fallback.
 */
export async function fetchProviderModels(
  provider: AIProviderId,
  apiKey: string,
  customEndpoint?: string
): Promise<FetchedModel[]> {
  try {
    switch (provider) {
      case 'openai':
        return await fetchOpenAIModels(apiKey);

      case 'groq':
        return await fetchOpenAICompatibleModels(
          'https://api.groq.com/openai/v1/models',
          apiKey,
          filterGroqModels
        );

      case 'openrouter':
        return await fetchOpenRouterModels(apiKey);

      case 'grok':
        return await fetchOpenAICompatibleModels(
          'https://api.x.ai/v1/models',
          apiKey,
          filterGrokModels
        );

      case 'mistral':
        return await fetchOpenAICompatibleModels(
          'https://api.mistral.ai/v1/models',
          apiKey,
          filterMistralModels
        );

      case 'gemini':
        return await fetchGeminiModels(apiKey);

      case 'anthropic':
        return await fetchAnthropicModels(apiKey);

      case 'custom': {
        const base = customEndpoint?.replace(/\/+$/, '') || 'http://localhost:11434/v1';
        const url = base.endsWith('/models') ? base : `${base}/models`;
        return await fetchOpenAICompatibleModels(url, apiKey, (models) => models);
      }

      default:
        return [];
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.warn(`Failed to fetch models from ${provider}:`, message);
    return [];
  }
}

// ─────────────────────────────────────────────
// Provider-Specific Fetchers
// ─────────────────────────────────────────────

async function fetchOpenAIModels(apiKey: string): Promise<FetchedModel[]> {
  const res = await fetch('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) throw new Error(`OpenAI error: HTTP ${res.status}`);

  const data = await res.json();
  const chatModels = (data.data || [])
    .filter((m: { id: string; owned_by?: string }) =>
      (m.id.startsWith('gpt-') || m.id.startsWith('o1') || m.id.startsWith('o3')) &&
      !m.id.includes('instruct') &&
      !m.id.includes('0301') &&
      !m.id.includes('0314') &&
      !m.id.includes('0613')
    )
    .sort((a: { id: string }, b: { id: string }) => b.id.localeCompare(a.id))
    .map((m: { id: string }) => ({
      id: m.id,
      name: formatModelName(m.id),
      tag: m.id.includes('mini') || m.id.includes('nano') ? 'Cost Effective' : undefined,
    }));

  return chatModels;
}

async function fetchGeminiModels(apiKey: string): Promise<FetchedModel[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`
  );

  if (!res.ok) throw new Error(`Gemini error: HTTP ${res.status}`);

  const data = await res.json();
  return (data.models || [])
    .filter(
      (m: { name: string; supportedGenerationMethods?: string[] }) =>
        m.supportedGenerationMethods?.includes('generateContent') &&
        !m.name.includes('embedding') &&
        !m.name.includes('aqa') &&
        !m.name.includes('vision') // stable non-vision text models only
    )
    .map((m: { name: string; displayName?: string; description?: string }) => {
      const id = m.name.replace('models/', '');
      const isFree =
        id.includes('flash') || id.includes('2.0') || id.includes('exp');
      return {
        id,
        name: m.displayName || formatModelName(id),
        tag: isFree ? 'Free tier' : undefined,
        is_free: isFree,
      };
    })
    .sort((a: FetchedModel, b: FetchedModel) => {
      if (a.is_free && !b.is_free) return -1;
      if (!a.is_free && b.is_free) return 1;
      return b.id.localeCompare(a.id);
    });
}

async function fetchAnthropicModels(apiKey: string): Promise<FetchedModel[]> {
  const res = await fetch('https://api.anthropic.com/v1/models', {
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
  });

  if (!res.ok) throw new Error(`Anthropic error: HTTP ${res.status}`);

  const data = await res.json();
  return (data.data || [])
    .filter(
      (m: { id: string }) =>
        m.id.startsWith('claude-') &&
        (m.id.includes('sonnet') || m.id.includes('haiku') || m.id.includes('opus'))
    )
    .map((m: { id: string; display_name?: string }) => ({
      id: m.id,
      name: m.display_name || formatModelName(m.id),
      tag: m.id.includes('haiku') ? 'Fast & Efficient' : m.id.includes('sonnet') ? 'Recommended' : 'Most Capable',
    }));
}

async function fetchOpenRouterModels(apiKey: string): Promise<FetchedModel[]> {
  const res = await fetch('https://openrouter.ai/api/v1/models', {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://qwalify.online',
      'X-Title': 'Qwalify AI',
    },
  });

  if (!res.ok) throw new Error(`OpenRouter error: HTTP ${res.status}`);

  const data = await res.json();
  const models = (data.data || []) as Array<{
    id: string;
    name: string;
    context_length?: number;
    pricing?: { prompt: string; completion: string };
  }>;

  // Separate free and paid
  const categorized = models
    .filter(
      (m) =>
        !m.id.includes('embed') &&
        !m.id.includes('dall-e') &&
        !m.id.includes('tts') &&
        !m.id.includes('whisper')
    )
    .map((m) => {
      const isFree =
        m.id.endsWith(':free') ||
        (m.pricing && parseFloat(m.pricing.prompt) === 0 && parseFloat(m.pricing.completion) === 0);
      return {
        id: m.id,
        name: m.name,
        context_length: m.context_length,
        tag: isFree ? 'Free' : undefined,
        is_free: Boolean(isFree),
      };
    })
    .sort((a, b) => {
      if (a.is_free && !b.is_free) return -1;
      if (!a.is_free && b.is_free) return 1;
      return a.name.localeCompare(b.name);
    });

  // Cap list to top 50 to keep UX manageable
  return categorized.slice(0, 50);
}

async function fetchOpenAICompatibleModels(
  url: string,
  apiKey: string,
  filter: (models: FetchedModel[]) => FetchedModel[]
): Promise<FetchedModel[]> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) throw new Error(`API error: HTTP ${res.status}`);

  const data = await res.json();
  const raw: FetchedModel[] = (data.data || data.models || []).map(
    (m: { id: string; name?: string }) => ({
      id: m.id,
      name: m.name || formatModelName(m.id),
    })
  );

  return filter(raw);
}

// ─────────────────────────────────────────────
// Provider-Specific Model Filters
// ─────────────────────────────────────────────

function filterGroqModels(models: FetchedModel[]): FetchedModel[] {
  return models
    .filter((m) => !m.id.includes('whisper') && !m.id.includes('guard'))
    .map((m) => ({
      ...m,
      name: formatModelName(m.id),
      tag: m.id.includes('70b') || m.id.includes('90b') ? 'High Capability' :
           m.id.includes('8b') || m.id.includes('11b') ? 'Ultra Fast' : undefined,
    }));
}

function filterGrokModels(models: FetchedModel[]): FetchedModel[] {
  return models
    .filter((m) => m.id.startsWith('grok-'))
    .map((m) => ({
      ...m,
      name: formatModelName(m.id),
      tag: m.id.includes('mini') ? 'Fast' : 'Latest',
    }));
}

function filterMistralModels(models: FetchedModel[]): FetchedModel[] {
  return models
    .filter(
      (m) =>
        !m.id.includes('embed') &&
        !m.id.includes('moderation') &&
        !m.id.includes('pixtral')
    )
    .map((m) => ({
      ...m,
      name: formatModelName(m.id),
    }));
}

// ─────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────

function formatModelName(id: string): string {
  return id
    .replace(/-(\d{4}-\d{2}-\d{2})$/, '') // strip date suffix
    .replace(/-latest$/, '')
    .split(/[-_]/)
    .map((part) =>
      ['gpt', 'o1', 'o3', 'grok', 'ai', 'id', 'lm', 'api'].includes(part.toLowerCase())
        ? part.toUpperCase()
        : part.charAt(0).toUpperCase() + part.slice(1)
    )
    .join(' ');
}
