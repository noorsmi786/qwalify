import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Bot,
  Sparkles,
  Sliders,
  CheckCircle2,
  Plus,
  Trash2,
  Save,
  Send,
  Loader2,
  RotateCcw,
  HelpCircle,
  MessageSquare,
} from 'lucide-react';
import type { AIAgent, IndustryType, ToneType, EmojiStyle, KnowledgeItem, QualificationQuestion } from '@/types/agent';
import { INDUSTRY_TEMPLATES } from '@/lib/ai/industryTemplates';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AgentEditorModalProps {
  agent: AIAgent | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (agentData: Partial<AIAgent>) => Promise<void>;
}

type TabType = 'identity' | 'tone' | 'knowledge' | 'qualification' | 'simulator';

export function AgentEditorModal({ agent, isOpen, onClose, onSave }: AgentEditorModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('identity');

  // Form state
  const [name, setName] = useState(agent?.name || 'New AI Worker');
  const [industry, setIndustry] = useState<IndustryType>(agent?.industry || 'dental');
  const [tone, setTone] = useState<ToneType>(agent?.tone || 'friendly');
  const [emojiStyle, setEmojiStyle] = useState<EmojiStyle>(agent?.emoji_style || 'subtle');
  const [language] = useState(agent?.language || 'en');
  const [customPrompt, setCustomPrompt] = useState(agent?.custom_system_prompt || '');
  const [bookingUrl, setBookingUrl] = useState(agent?.booking_url || '');
  const [meetingDuration] = useState(agent?.meeting_duration_mins || 30);
  const [hotThreshold, setHotThreshold] = useState(agent?.hot_threshold || 75);
  const [warmThreshold] = useState(agent?.warm_threshold || 45);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeItem[]>(
    agent?.knowledge_base || INDUSTRY_TEMPLATES[agent?.industry || 'dental'].suggestedKnowledge
  );
  const [qualificationRules, setQualificationRules] = useState<QualificationQuestion[]>(
    agent?.qualification_rules || INDUSTRY_TEMPLATES[agent?.industry || 'dental'].suggestedQuestions
  );
  const [isActive, setIsActive] = useState(agent?.is_active ?? true);
  const [isSaving, setIsSaving] = useState(false);

  // Simulator state
  const [simMessages, setSimMessages] = useState<{ sender: 'lead' | 'ai'; text: string; score?: number }[]>([
    {
      sender: 'ai',
      text: INDUSTRY_TEMPLATES[industry]?.sampleGreeting || 'Hello! How can I assist you today?',
      score: 15,
    },
  ]);
  const [simInput, setSimInput] = useState('');
  const [simScore, setSimScore] = useState(15);
  const [isSimLoading, setIsSimLoading] = useState(false);

  if (!isOpen) return null;

  // Handle template change
  const handleIndustryChange = (newInd: IndustryType) => {
    setIndustry(newInd);
    const tmpl = INDUSTRY_TEMPLATES[newInd];
    setTone(tmpl.defaultTone);
    setEmojiStyle(tmpl.defaultEmoji);
    setKnowledgeBase(tmpl.suggestedKnowledge);
    setQualificationRules(tmpl.suggestedQuestions);
    setBookingUrl(tmpl.defaultBookingUrl);
    setSimMessages([
      {
        sender: 'ai',
        text: tmpl.sampleGreeting,
        score: 15,
      },
    ]);
    setSimScore(15);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter an agent name');
      return;
    }
    setIsSaving(true);
    try {
      await onSave({
        name,
        industry,
        tone,
        emoji_style: emojiStyle,
        language,
        custom_system_prompt: customPrompt,
        booking_url: bookingUrl,
        meeting_duration_mins: Number(meetingDuration),
        hot_threshold: Number(hotThreshold),
        warm_threshold: Number(warmThreshold),
        knowledge_base: knowledgeBase,
        qualification_rules: qualificationRules,
        is_active: isActive,
      });
      onClose();
    } catch {
      toast.error('Failed to save agent settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Knowledge operations
  const addKnowledgeItem = () => {
    setKnowledgeBase([
      ...knowledgeBase,
      {
        id: 'k_' + Math.random().toString(36).substring(2, 7),
        category: 'General',
        question: 'What question might a prospect ask?',
        answer: 'Provide the clear, concise answer here.',
      },
    ]);
  };

  const removeKnowledgeItem = (id: string) => {
    setKnowledgeBase(knowledgeBase.filter((k) => k.id !== id));
  };

  // Qualification question operations
  const addQuestion = () => {
    setQualificationRules([
      ...qualificationRules,
      {
        id: 'q_' + Math.random().toString(36).substring(2, 7),
        text: 'What is your budget or timeline?',
        weight: 25,
        required: true,
      },
    ]);
  };

  const removeQuestion = (id: string) => {
    setQualificationRules(qualificationRules.filter((q) => q.id !== id));
  };

  // Simulator send
  const handleSimSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!simInput.trim() || isSimLoading) return;

    const userText = simInput.trim();
    setSimInput('');
    const newHistory = [...simMessages, { sender: 'lead' as const, text: userText }];
    setSimMessages(newHistory);
    setIsSimLoading(true);

    // Simulate SDR reply tailored to industry
    await new Promise((r) => setTimeout(r, 800));
    const newScore = Math.min(100, simScore + 25);
    setSimScore(newScore);

    let reply = `Understood! Let's get that scheduled for you right away.`;
    if (newScore >= hotThreshold && bookingUrl) {
      reply = `That sounds like a great fit! You can pick a direct time with our team here: ${bookingUrl} 📅`;
    } else if (industry === 'dental') {
      reply = `Got it! Are you looking for morning or afternoon appointment slots this week?`;
    } else if (industry === 'real_estate') {
      reply = `Perfect. Do you have a preferred neighborhood or move-in timeline?`;
    } else if (industry === 'salon') {
      reply = `Wonderful! Which stylist or time works best for you this weekend?`;
    } else {
      reply = `Thanks for sharing that! What is your target timeline for launching?`;
    }

    setSimMessages([...newHistory, { sender: 'ai', text: reply, score: newScore }]);
    setIsSimLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-4xl bg-navy-900 border border-navy-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-800 bg-navy-950/60 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center text-white shadow-lg shadow-violet-600/20">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">{name}</h2>
              <p className="text-xs text-slate-400">
                {INDUSTRY_TEMPLATES[industry]?.name} · {tone.toUpperCase()} Tone
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsActive(!isActive)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5',
                isActive
                  ? 'bg-teal-500/10 border-teal-500/30 text-teal-400'
                  : 'bg-slate-800 border-slate-700 text-slate-500'
              )}
            >
              <span className={cn('w-2 h-2 rounded-full', isActive ? 'bg-teal-400 animate-pulse' : 'bg-slate-500')} />
              {isActive ? 'Active Worker' : 'Paused'}
            </button>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition-colors p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-navy-800 bg-navy-950/30 px-6 overflow-x-auto flex-shrink-0">
          {[
            { id: 'identity', label: '1. Identity & Industry', icon: Bot },
            { id: 'tone', label: '2. Persona & Tone', icon: Sparkles },
            { id: 'knowledge', label: '3. Knowledge Base', icon: HelpCircle },
            { id: 'qualification', label: '4. Lead Qualification', icon: Sliders },
            { id: 'simulator', label: '5. Live Simulator', icon: MessageSquare },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-all',
                  active
                    ? 'border-violet-500 text-violet-400 bg-violet-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: IDENTITY & INDUSTRY TEMPLATES */}
          {activeTab === 'identity' && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Worker Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dr. Smile Booking Assistant"
                  className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Choose Industry Template (Pre-configured rules & questions)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {(Object.keys(INDUSTRY_TEMPLATES) as IndustryType[]).map((indKey) => {
                    const t = INDUSTRY_TEMPLATES[indKey];
                    const selected = industry === indKey;
                    return (
                      <button
                        key={indKey}
                        type="button"
                        onClick={() => handleIndustryChange(indKey)}
                        className={cn(
                          'p-4 rounded-xl border text-left transition-all relative flex flex-col justify-between space-y-2',
                          selected
                            ? 'bg-violet-600/15 border-violet-500 shadow-lg shadow-violet-600/10'
                            : 'bg-navy-800/60 border-navy-700 hover:border-navy-600'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-md border', t.color)}>
                            {t.badge}
                          </span>
                          {selected && <CheckCircle2 className="w-4 h-4 text-violet-400" />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-100">{t.name}</p>
                          <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">{t.tagline}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PERSONA & TONE */}
          {activeTab === 'tone' && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">Conversation Tone</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'empathetic', label: '🤝 Empathetic & Caring', desc: 'Warm, patient, reassurance (Clinics & Care)' },
                    { id: 'professional', label: '👔 Polished & Professional', desc: 'Authoritative, polite, clear (B2B & Realty)' },
                    { id: 'friendly', label: '🎉 Friendly & Helpful', desc: 'Enthusiastic, approachable (Schools & Retail)' },
                    { id: 'casual', label: '✨ Casual & Trendy', desc: 'Modern, vibrant, upbeat (Salons & Spas)' },
                    { id: 'direct', label: '⚡ Fast & Direct', desc: 'High velocity, concise answers (Auto & High Ticket)' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTone(t.id as ToneType)}
                      className={cn(
                        'p-3.5 rounded-xl border text-left transition-all',
                        tone === t.id
                          ? 'bg-violet-600/15 border-violet-500 text-violet-200'
                          : 'bg-navy-800/60 border-navy-700 text-slate-400 hover:text-slate-200'
                      )}
                    >
                      <p className="text-xs font-bold text-slate-100 mb-1">{t.label}</p>
                      <p className="text-[10px] leading-relaxed text-slate-400">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">Emoji Style</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'none', label: 'No Emojis', desc: 'Strict plain text' },
                    { id: 'subtle', label: 'Subtle (1-2 per chat)', desc: 'Balanced & natural' },
                    { id: 'expressive', label: 'Expressive ✨', desc: 'Lively & colorful' },
                  ].map((em) => (
                    <button
                      key={em.id}
                      type="button"
                      onClick={() => setEmojiStyle(em.id as EmojiStyle)}
                      className={cn(
                        'p-3 rounded-xl border text-left transition-all',
                        emojiStyle === em.id
                          ? 'bg-violet-600/15 border-violet-500 text-violet-200'
                          : 'bg-navy-800/60 border-navy-700 text-slate-400 hover:text-slate-200'
                      )}
                    >
                      <p className="text-xs font-bold text-slate-100">{em.label}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{em.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Custom Prompt Instructions (Optional override)
                </label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="e.g. Always emphasize that teeth whitening includes a free take-home gel kit..."
                  rows={3}
                  className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-600 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/50 leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* TAB 3: BUSINESS KNOWLEDGE (Q&A) */}
          {activeTab === 'knowledge' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-slate-200">Business FAQs & Knowledge Cards</h3>
                  <p className="text-[11px] text-slate-400">
                    The AI references these cards to answer customer questions about pricing, location, hours, etc.
                  </p>
                </div>
                <Button size="sm" onClick={addKnowledgeItem} className="text-xs">
                  <Plus className="w-3.5 h-3.5" /> Add Knowledge Card
                </Button>
              </div>

              <div className="space-y-3">
                {knowledgeBase.map((item, idx) => (
                  <div key={item.id || idx} className="p-4 rounded-xl border border-navy-700 bg-navy-800/50 space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <input
                        type="text"
                        value={item.category}
                        onChange={(e) => {
                          const updated = [...knowledgeBase];
                          updated[idx].category = e.target.value;
                          setKnowledgeBase(updated);
                        }}
                        placeholder="Category (e.g. Pricing, Location)"
                        className="w-36 bg-navy-900 border border-navy-700 rounded-lg px-2.5 py-1 text-xs font-bold text-violet-400"
                      />
                      <button
                        onClick={() => removeKnowledgeItem(item.id)}
                        className="text-slate-500 hover:text-red-400 transition-colors p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <input
                      type="text"
                      value={item.question}
                      onChange={(e) => {
                        const updated = [...knowledgeBase];
                        updated[idx].question = e.target.value;
                        setKnowledgeBase(updated);
                      }}
                      placeholder="Question: e.g. What insurance do you accept?"
                      className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-medium"
                    />

                    <textarea
                      value={item.answer}
                      onChange={(e) => {
                        const updated = [...knowledgeBase];
                        updated[idx].answer = e.target.value;
                        setKnowledgeBase(updated);
                      }}
                      placeholder="Answer: e.g. We accept Delta Dental, MetLife, Cigna, and offer 0% payment plans."
                      rows={2}
                      className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 placeholder-slate-600 resize-none leading-relaxed"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: QUALIFICATION & SCORING */}
          {activeTab === 'qualification' && (
            <div className="space-y-6">
              {/* Question list */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-200">Qualification Criteria Questions</h3>
                    <p className="text-[11px] text-slate-400">
                      The SDR asks these questions to evaluate buyer intent and calculate a score (0 to 100).
                    </p>
                  </div>
                  <Button size="sm" onClick={addQuestion} className="text-xs">
                    <Plus className="w-3.5 h-3.5" /> Add Question
                  </Button>
                </div>

                {qualificationRules.map((q, idx) => (
                  <div key={q.id || idx} className="p-3.5 rounded-xl border border-navy-700 bg-navy-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex-1 w-full">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono text-slate-500">Q{idx + 1}</span>
                        <input
                          type="text"
                          value={q.text}
                          onChange={(e) => {
                            const updated = [...qualificationRules];
                            updated[idx].text = e.target.value;
                            setQualificationRules(updated);
                          }}
                          className="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-400">Weight:</span>
                        <input
                          type="number"
                          min={5}
                          max={50}
                          value={q.weight}
                          onChange={(e) => {
                            const updated = [...qualificationRules];
                            updated[idx].weight = Number(e.target.value);
                            setQualificationRules(updated);
                          }}
                          className="w-14 bg-navy-900 border border-navy-700 rounded-lg px-2 py-1 text-xs text-teal-400 font-mono text-center"
                        />
                        <span className="text-[10px] text-slate-500">pts</span>
                      </div>

                      <button
                        onClick={() => removeQuestion(q.id)}
                        className="text-slate-500 hover:text-red-400 transition-colors p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Thresholds & Booking Link */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-navy-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Hot Lead Threshold (Triggers Auto-Booking)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={50}
                      max={95}
                      value={hotThreshold}
                      onChange={(e) => setHotThreshold(Number(e.target.value))}
                      className="flex-1 accent-violet-500"
                    />
                    <span className="font-mono font-bold text-sm text-teal-400 px-2 py-1 rounded bg-navy-800 border border-navy-700">
                      {hotThreshold}/100
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Leads scoring above this score receive your booking link.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Meeting / Calendar Booking URL
                  </label>
                  <input
                    type="url"
                    value={bookingUrl}
                    onChange={(e) => setBookingUrl(e.target.value)}
                    placeholder="https://calendly.com/your-business/slot"
                    className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3.5 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: LIVE SIMULATOR */}
          {activeTab === 'simulator' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-slate-200">Interactive WhatsApp Sandbox</h3>
                  <p className="text-[11px] text-slate-400">
                    Test how this worker answers and qualifies before turning it on for real WhatsApp numbers.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-teal-400 bg-teal-500/10 px-2.5 py-1 rounded-lg border border-teal-500/20">
                    Score: {simScore}/100
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSimScore(15);
                      setSimMessages([
                        {
                          sender: 'ai',
                          text: INDUSTRY_TEMPLATES[industry]?.sampleGreeting || 'Hello! How can I assist you?',
                          score: 15,
                        },
                      ]);
                    }}
                    className="text-xs"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset
                  </Button>
                </div>
              </div>

              {/* Chat sandbox box */}
              <div className="bg-navy-950/80 border border-navy-800 rounded-2xl p-4 flex flex-col h-72 justify-between">
                <div className="overflow-y-auto space-y-3 pr-2">
                  {simMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={cn(
                        'flex flex-col max-w-[85%] text-xs leading-relaxed',
                        msg.sender === 'ai' ? 'items-start mr-auto' : 'items-end ml-auto'
                      )}
                    >
                      <span className="text-[10px] text-slate-500 mb-0.5">
                        {msg.sender === 'ai' ? `🤖 ${name}` : '👤 Test Prospect'}
                      </span>
                      <div
                        className={cn(
                          'px-3.5 py-2 rounded-2xl',
                          msg.sender === 'ai'
                            ? 'bg-violet-600/20 border border-violet-500/30 text-violet-100 rounded-tl-sm'
                            : 'bg-navy-800 border border-navy-700 text-slate-200 rounded-tr-sm'
                        )}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {isSimLoading && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 italic">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-400" />
                      <span>{name} is typing...</span>
                    </div>
                  )}
                </div>

                <form onSubmit={handleSimSend} className="flex gap-2 pt-3 border-t border-navy-800">
                  <input
                    type="text"
                    value={simInput}
                    onChange={(e) => setSimInput(e.target.value)}
                    placeholder={`Type a test message (e.g. "I have severe toothache", "Looking for 3-bed house")...`}
                    className="flex-1 bg-navy-900 border border-navy-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  />
                  <Button size="sm" type="submit" disabled={!simInput.trim() || isSimLoading}>
                    <Send className="w-3.5 h-3.5" /> Send
                  </Button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-navy-800 bg-navy-950/60 flex items-center justify-between flex-shrink-0">
          <Button variant="ghost" onClick={onClose} className="text-xs">
            Cancel
          </Button>
          <Button onClick={handleSave} loading={isSaving} className="text-xs">
            <Save className="w-4 h-4" /> Save Worker
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
