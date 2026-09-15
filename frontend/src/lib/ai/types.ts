export type AIProviderId =
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'openrouter'
  | 'groq'
  | 'grok'
  | 'mistral'
  | 'cohere'
  | 'custom';

export interface AIProviderMeta {
  id: AIProviderId;
  name: string;
  badge?: string;
  badgeType?: 'free' | 'popular' | 'fast';
  description: string;
  defaultModel: string;
  availableModels: { id: string; name: string; tag?: string }[];
  keyGuideUrl: string;
  keyGuideSteps: string[];
  placeholderKey: string;
  requiresCustomEndpoint?: boolean;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface QualificationResult {
  replyText: string;
  extractedScore: number;
  scoreReason: string;
  isHandoffReady: boolean;
  handoffReason?: string;
  extractedData: {
    budget?: string;
    timeline?: string;
    teamSize?: string;
    painPoint?: string;
    role?: string;
  };
}

export interface AIProviderConfig {
  id?: string;
  tenant_id?: string;
  provider: AIProviderId;
  model: string;
  api_key: string;
  custom_endpoint?: string;
  is_active: boolean;
  system_prompt?: string;
  temperature?: number;
}
