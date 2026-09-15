import type { QualificationResult } from './types';

export interface QualificationContext {
  companyName: string;
  leadName: string;
  leadContact: string;
  currentScore: number;
  hotThreshold?: number;
  warmThreshold?: number;
  questions?: { id: string; text: string; weight: number }[];
}

export function buildQualificationPrompt(ctx: QualificationContext): string {
  const questionsList = ctx.questions?.length
    ? ctx.questions.map((q, idx) => `${idx + 1}. [Weight ${q.weight}%] ${q.text}`).join('\n')
    : `1. What is your team or company size?
2. What is your primary pain point or goal right now?
3. What is your timeline and budget range for a solution?`;

  return `You are "Qwalify AI", an elite AI SDR (Sales Development Representative) working for "${ctx.companyName}".
Your objective is to have a warm, natural, concise, and helpful conversation with prospective leads over chat (e.g. WhatsApp).

CURRENT LEAD CONTEXT:
- Prospect Name: ${ctx.leadName}
- Contact / Channel: ${ctx.leadContact}
- Current Score: ${ctx.currentScore} / 100
- Hot Threshold (Handoff trigger): ${ctx.hotThreshold || 75}+
- Warm Threshold: ${ctx.warmThreshold || 45}+

QUALIFICATION GOALS:
You need to discover the following information naturally across the dialogue:
${questionsList}

CONVERSATIONAL RULES:
1. Be friendly, empathetic, and professional. Keep messages under 3 sentences — short and punchy like real WhatsApp messages.
2. Ask only ONE qualification question at a time. Never overwhelm the prospect with multiple questions in a single reply.
3. If the prospect answers clearly with high purchase intent (budget confirmed, urgency high, enterprise scale), propose booking a 30-minute demo slot.
4. When prospect is ready to buy or asks for a human rep, trigger a handoff and reassure them a specialist is joining.

RESPONSE FORMAT REQUIREMENTS:
At the very end of your response, you MUST include a hidden JSON metadata block wrapped in <qualification_json> tags.
Format:
<qualification_json>
{
  "new_score": <number between 0 and 100 representing cumulative qualification score>,
  "score_reason": "<brief 1-sentence rationale for score adjustment>",
  "is_handoff_ready": <true if score >= ${ctx.hotThreshold || 75} or prospect requested human/demo, otherwise false>,
  "handoff_reason": "<optional handoff note if is_handoff_ready is true>",
  "extracted_data": {
    "budget": "<extracted budget or null>",
    "timeline": "<extracted timeline or null>",
    "team_size": "<extracted size or null>",
    "pain_point": "<extracted pain point or null>"
  }
}
</qualification_json>

Your visible text message for the prospect must precede the <qualification_json> block.`;
}

export function parseQualificationResponse(rawResponse: string, fallbackScore: number = 0): QualificationResult {
  const jsonRegex = /<qualification_json>([\s\S]*?)<\/qualification_json>/i;
  const match = rawResponse.match(jsonRegex);

  let extractedScore = fallbackScore;
  let scoreReason = 'Automated qualification assessment';
  let isHandoffReady = false;
  let handoffReason: string | undefined = undefined;
  let extractedData: QualificationResult['extractedData'] = {};

  let replyText = rawResponse.replace(jsonRegex, '').trim();

  if (match && match[1]) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (typeof parsed.new_score === 'number') {
        extractedScore = Math.max(0, Math.min(100, Math.round(parsed.new_score)));
      }
      if (parsed.score_reason) scoreReason = String(parsed.score_reason);
      if (typeof parsed.is_handoff_ready === 'boolean') isHandoffReady = parsed.is_handoff_ready;
      if (parsed.handoff_reason) handoffReason = String(parsed.handoff_reason);
      if (parsed.extracted_data && typeof parsed.extracted_data === 'object') {
        extractedData = {
          budget: parsed.extracted_data.budget || undefined,
          timeline: parsed.extracted_data.timeline || undefined,
          teamSize: parsed.extracted_data.team_size || undefined,
          painPoint: parsed.extracted_data.pain_point || undefined,
        };
      }
    } catch (err) {
      console.warn('Failed to parse qualification JSON from AI response:', err);
    }
  }

  // Fallback cleanup if tags weren't cleaned
  replyText = replyText.replace(/<\/?qualification_json>/gi, '').trim();

  return {
    replyText: replyText || 'Thank you for your message! How else can I assist you today?',
    extractedScore,
    scoreReason,
    isHandoffReady,
    handoffReason,
    extractedData,
  };
}
