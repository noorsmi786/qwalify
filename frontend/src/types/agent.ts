export type IndustryType =
  | 'dental'
  | 'real_estate'
  | 'salon'
  | 'school'
  | 'b2b'
  | 'auto'
  | 'custom';

export type ToneType = 'friendly' | 'professional' | 'direct' | 'empathetic' | 'casual';

export type EmojiStyle = 'none' | 'subtle' | 'expressive';

export interface KnowledgeItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

export interface QualificationQuestion {
  id: string;
  text: string;
  weight: number;
  required: boolean;
  idealAnswer?: string;
}

export interface AIAgent {
  id: string;
  tenant_id: string;
  name: string;
  industry: IndustryType;
  avatar_icon: string;
  tone: ToneType;
  emoji_style: EmojiStyle;
  language: string;
  custom_system_prompt?: string;
  knowledge_base: KnowledgeItem[];
  qualification_rules: QualificationQuestion[];
  hot_threshold: number;
  warm_threshold: number;
  followup_cadence?: 'gentle' | 'balanced' | 'aggressive';
  business_description?: string;
  booking_url?: string;
  meeting_duration_mins: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface IndustryTemplate {
  id: IndustryType;
  name: string;
  badge: string;
  icon: string;
  color: string;
  tagline: string;
  description: string;
  defaultTone: ToneType;
  defaultEmoji: EmojiStyle;
  suggestedQuestions: QualificationQuestion[];
  suggestedKnowledge: KnowledgeItem[];
  defaultBookingUrl: string;
  sampleGreeting: string;
}
