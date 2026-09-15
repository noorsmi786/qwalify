import type { AIMessage, AIProviderConfig, QualificationResult } from './types';
import { buildQualificationPrompt, parseQualificationResponse, type QualificationContext } from './systemPrompt';

export async function testAIConnection(config: {
  provider: string;
  model: string;
  api_key: string;
  custom_endpoint?: string;
}): Promise<{ ok: boolean; message: string }> {
  try {
    const testMessages: AIMessage[] = [
      { role: 'user', content: 'Say "OK" in exactly one word to verify connection.' },
    ];

    const response = await sendAIChatRequest({
      config: {
        provider: config.provider as any,
        model: config.model,
        api_key: config.api_key,
        custom_endpoint: config.custom_endpoint,
        is_active: true,
      },
      messages: testMessages,
      temperature: 0.1,
    });

    if (response && response.length > 0) {
      return { ok: true, message: `Connected successfully! Model responded: "${response.slice(0, 30)}..."` };
    }
    return { ok: false, message: 'Empty response received from provider.' };
  } catch (err: any) {
    return { ok: false, message: err.message || 'Failed to connect to AI provider' };
  }
}

export async function executeQualificationTurn(params: {
  config: AIProviderConfig;
  context: QualificationContext;
  conversationHistory: { sender: 'lead' | 'ai' | 'human'; content: string }[];
  latestLeadMessage: string;
}): Promise<QualificationResult> {
  const systemPrompt = params.config.system_prompt || buildQualificationPrompt(params.context);

  const formattedMessages: AIMessage[] = [
    { role: 'system', content: systemPrompt },
    ...params.conversationHistory.map((m) => ({
      role: (m.sender === 'lead' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: params.latestLeadMessage },
  ];

  const rawResponse = await sendAIChatRequest({
    config: params.config,
    messages: formattedMessages,
    temperature: params.config.temperature ?? 0.3,
  });

  return parseQualificationResponse(rawResponse, params.context.currentScore);
}

export async function sendAIChatRequest(params: {
  config: AIProviderConfig;
  messages: AIMessage[];
  temperature?: number;
}): Promise<string> {
  const { config, messages, temperature = 0.3 } = params;

  // 1. GOOGLE GEMINI
  if (config.provider === 'gemini') {
    const model = config.model || 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(config.api_key)}`;

    const systemInstruction = messages.find((m) => m.role === 'system')?.content;
    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const payload: any = {
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens: 800,
      },
    };

    if (systemInstruction) {
      payload.systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Gemini API Error: HTTP ${res.status}`);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidate) throw new Error('No content returned from Gemini.');
    return candidate;
  }

  // 2. ANTHROPIC CLAUDE
  if (config.provider === 'anthropic') {
    const model = config.model || 'claude-3-5-haiku-20241022';
    const systemPrompt = messages.find((m) => m.role === 'system')?.content;
    const chatMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }));

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': config.api_key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'dangerously-allow-browser': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: 800,
        temperature,
        system: systemPrompt,
        messages: chatMessages,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Anthropic API Error: HTTP ${res.status}`);
    }

    const data = await res.json();
    return data.content?.[0]?.text || '';
  }

  // 3. OPENAI-COMPATIBLE PROVIDERS (OpenAI, Groq, OpenRouter, Grok, Mistral, Custom)
  let baseUrl = 'https://api.openai.com/v1/chat/completions';
  const customHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.api_key}`,
  };

  switch (config.provider) {
    case 'groq':
      baseUrl = 'https://api.groq.com/openai/v1/chat/completions';
      break;
    case 'openrouter':
      baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
      customHeaders['HTTP-Referer'] = 'https://qwalify.online';
      customHeaders['X-Title'] = 'Qwalify AI';
      break;
    case 'grok':
      baseUrl = 'https://api.x.ai/v1/chat/completions';
      break;
    case 'mistral':
      baseUrl = 'https://api.mistral.ai/v1/chat/completions';
      break;
    case 'custom':
      baseUrl = config.custom_endpoint
        ? (config.custom_endpoint.endsWith('/chat/completions')
            ? config.custom_endpoint
            : `${config.custom_endpoint.replace(/\/+$/, '')}/chat/completions`)
        : 'http://localhost:11434/v1/chat/completions';
      break;
  }

  const res = await fetch(baseUrl, {
    method: 'POST',
    headers: customHeaders,
    body: JSON.stringify({
      model: config.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature,
      max_tokens: 800,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `${config.provider.toUpperCase()} API Error: HTTP ${res.status}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error(`No text returned by ${config.provider}.`);
  return content;
}
