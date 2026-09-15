import { useState } from 'react';
import {
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Key,
  CheckCircle2,
  Eye,
  EyeOff,
  Send,
  Bot,
  User,
  RotateCcw,
  Loader2,
  RefreshCw,
  AlertCircle,
  WifiOff,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AI_PROVIDERS_LIST } from '@/lib/ai/providersMeta';
import { useAIConfig } from '@/hooks/useAIConfig';
import { useDynamicModels } from '@/hooks/useDynamicModels';
import type { AIProviderId } from '@/lib/ai/types';
import { executeQualificationTurn } from '@/lib/ai';

export function AIProvidersTab() {
  const { configs, activeProvider, testingProvider, saveConfig, setAsActive, testProvider } = useAIConfig();
  const { getState, getModels, triggerFetch } = useDynamicModels();

  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  // Simulator state
  const [simMessages, setSimMessages] = useState<
    { sender: 'lead' | 'ai' | 'human'; content: string; score?: number }[]
  >([
    {
      sender: 'ai',
      content:
        'Hi there! 👋 Thanks for reaching out to Acme Corp. What is the biggest challenge your team is facing right now?',
      score: 10,
    },
  ]);
  const [simInput, setSimInput] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simScore, setSimScore] = useState(10);

  const toggleShowKey = (id: string) => setShowKeys((p) => ({ ...p, [id]: !p[id] }));

  // When user types/pastes a key, immediately fire a debounced model fetch
  const handleKeyChange = (provider: AIProviderId, value: string, customEndpoint?: string) => {
    const config = configs[provider] || { provider, model: '', api_key: '', is_active: false };
    saveConfig({ ...config, api_key: value });
    triggerFetch(provider, value, customEndpoint);
  };

  const handleModelChange = (provider: AIProviderId, model: string) => {
    const config = configs[provider] || { provider, model, api_key: '', is_active: false };
    saveConfig({ ...config, model });
  };

  const handleSimSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!simInput.trim() || isSimulating) return;

    const userText = simInput.trim();
    setSimInput('');
    setSimMessages((prev) => [...prev, { sender: 'lead', content: userText }]);
    setIsSimulating(true);

    try {
      const activeConf = configs[activeProvider];
      if (!activeConf?.api_key) {
        await new Promise((r) => setTimeout(r, 900));
        const updated = Math.min(100, simScore + 20);
        setSimScore(updated);
        setSimMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            content: `Great insight! What's your current budget range and timeline? [Mock AI — paste a real key in the ${activeProvider} card above to test live!]`,
            score: updated,
          },
        ]);
        return;
      }

      const result = await executeQualificationTurn({
        config: activeConf,
        context: {
          companyName: 'Acme Corp',
          leadName: 'Alex Rivera (Test Prospect)',
          leadContact: '+1 (555) 019-2831',
          currentScore: simScore,
          hotThreshold: 75,
          warmThreshold: 45,
        },
        conversationHistory: simMessages,
        latestLeadMessage: userText,
      });

      setSimScore(result.extractedScore);
      setSimMessages((prev) => [
        ...prev,
        { sender: 'ai', content: result.replyText, score: result.extractedScore },
      ]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'API call failed';
      setSimMessages((prev) => [
        ...prev,
        { sender: 'ai', content: `⚠️ ${message}` },
      ]);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-violet-900/30 via-navy-800/60 to-teal-900/20 border border-violet-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-violet-600/20 text-violet-400 border border-violet-500/30">
              <Sparkles className="w-4 h-4" />
            </span>
            <h3 className="text-base font-semibold text-slate-100">Bring Your Own API Key (BYOAPI)</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
            Paste your key below — Qwalify <strong>automatically fetches the available models</strong> from that provider in real-time. No hardcoded lists. Choose <strong>Gemini</strong> or <strong>Groq</strong> for free access, or connect OpenAI / Claude for enterprise power.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-navy-900/80 px-3.5 py-2 rounded-xl border border-navy-700">
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
          <span className="text-xs text-slate-400">Active Engine:</span>
          <span className="text-xs font-bold text-teal-400 uppercase tracking-wide">{activeProvider}</span>
        </div>
      </div>

      {/* Provider Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {AI_PROVIDERS_LIST.map((provider) => {
          const config = configs[provider.id] ?? {
            provider: provider.id as AIProviderId,
            model: provider.defaultModel,
            api_key: '',
            is_active: provider.id === activeProvider,
          };
          const fetchState = getState(provider.id);
          const models = getModels(provider.id);
          const isActive = provider.id === activeProvider;
          const isTesting = testingProvider === provider.id;
          const isGuideOpen = expandedGuide === provider.id;

          return (
            <Card
              key={provider.id}
              className={`transition-all duration-200 ${
                isActive
                  ? 'border-violet-500/50 bg-navy-800/90 shadow-[0_0_25px_rgba(124,58,237,0.12)]'
                  : 'hover:border-navy-600'
              }`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-semibold text-slate-100 truncate">{provider.name}</h4>
                      {provider.badge && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border whitespace-nowrap ${
                            provider.badgeType === 'free'
                              ? 'bg-teal-500/15 text-teal-300 border-teal-500/30'
                              : 'bg-violet-500/15 text-violet-300 border-violet-500/30'
                          }`}
                        >
                          {provider.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {provider.description}
                    </p>
                  </div>
                  {isActive ? (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-teal-400 bg-teal-500/10 px-2 py-1 rounded-lg border border-teal-500/20 flex-shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Active
                    </span>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAsActive(provider.id)}
                      className="text-xs text-slate-400 hover:text-slate-200 flex-shrink-0"
                    >
                      Set Active
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-2">
                {/* Setup Guide Accordion */}
                <div className="rounded-lg bg-navy-900/70 border border-navy-700/80 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedGuide(isGuideOpen ? null : provider.id)}
                    className="w-full px-3 py-2 text-left flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 hover:bg-navy-800/40 transition-colors"
                  >
                    <span className="flex items-center gap-1.5 font-medium">
                      <Key className="w-3.5 h-3.5 text-violet-400" />
                      How to get your API key
                    </span>
                    {isGuideOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  <AnimatePresence>
                    {isGuideOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-3 pb-3 pt-1 border-t border-navy-700/60 text-xs space-y-2"
                      >
                        <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
                          {provider.keyGuideSteps.map((step, idx) => (
                            <li key={idx} className="leading-relaxed">{step}</li>
                          ))}
                        </ol>
                        <a
                          href={provider.keyGuideUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 font-medium underline mt-1"
                        >
                          Open {provider.name} Console <ExternalLink className="w-3 h-3" />
                        </a>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Custom Endpoint */}
                {provider.requiresCustomEndpoint && (
                  <Input
                    label="Endpoint URL"
                    placeholder="http://localhost:11434/v1"
                    value={config.custom_endpoint || ''}
                    onChange={(e) => {
                      const updated = { ...config, custom_endpoint: e.target.value };
                      saveConfig(updated);
                      triggerFetch(provider.id, config.api_key, e.target.value);
                    }}
                  />
                )}

                {/* API Key Input */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-medium text-slate-300">API Key</label>
                    {fetchState.status === 'success' && (
                      <span className="text-[10px] text-teal-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {models.length} models loaded
                      </span>
                    )}
                    {fetchState.status === 'error' && (
                      <span className="text-[10px] text-amber-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Using default list
                      </span>
                    )}
                    {fetchState.status === 'loading' && (
                      <span className="text-[10px] text-violet-400 flex items-center gap-1 animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Fetching models…
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showKeys[provider.id] ? 'text' : 'password'}
                      placeholder={provider.placeholderKey}
                      value={config.api_key || ''}
                      onChange={(e) => handleKeyChange(provider.id, e.target.value, config.custom_endpoint)}
                      className="w-full bg-navy-900/90 border border-navy-600 text-slate-100 placeholder-slate-600 rounded-lg px-3 py-2 pr-10 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                    />
                    <button
                      type="button"
                      onClick={() => toggleShowKey(provider.id)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showKeys[provider.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Model Selector — Dynamic */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-medium text-slate-300">Model</label>
                    {fetchState.status === 'success' && (
                      <button
                        type="button"
                        onClick={() => triggerFetch(provider.id, config.api_key, config.custom_endpoint)}
                        className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors"
                      >
                        <RefreshCw className="w-3 h-3" /> Refresh
                      </button>
                    )}
                  </div>

                  <div className="relative">
                    <select
                      value={config.model || provider.defaultModel}
                      onChange={(e) => handleModelChange(provider.id, e.target.value)}
                      disabled={fetchState.status === 'loading'}
                      className="w-full bg-navy-900/90 border border-navy-600 text-slate-200 rounded-lg px-3 py-2 pr-8 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/50 appearance-none disabled:opacity-50"
                    >
                      {/* Grouped: free first, then paid for OpenRouter */}
                      {provider.id === 'openrouter' ? (
                        <>
                          {models.filter((m) => m.is_free).length > 0 && (
                            <optgroup label="── Free Models ──">
                              {models
                                .filter((m) => m.is_free)
                                .map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.name || m.id}
                                    {m.context_length ? ` (${(m.context_length / 1000).toFixed(0)}k ctx)` : ''}
                                  </option>
                                ))}
                            </optgroup>
                          )}
                          {models.filter((m) => !m.is_free).length > 0 && (
                            <optgroup label="── Paid Models ──">
                              {models
                                .filter((m) => !m.is_free)
                                .map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.name || m.id}
                                    {m.context_length ? ` (${(m.context_length / 1000).toFixed(0)}k ctx)` : ''}
                                  </option>
                                ))}
                            </optgroup>
                          )}
                        </>
                      ) : (
                        models.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name || m.id}
                            {m.tag ? ` — ${m.tag}` : ''}
                          </option>
                        ))
                      )}
                    </select>

                    {/* Status icon inside dropdown */}
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      {fetchState.status === 'loading' ? (
                        <Loader2 className="w-3.5 h-3.5 text-violet-400 animate-spin" />
                      ) : fetchState.status === 'error' ? (
                        <span title={fetchState.errorMsg || ''}>
                          <WifiOff className="w-3.5 h-3.5 text-amber-500" />
                        </span>
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                      )}
                    </div>
                  </div>

                  {fetchState.status === 'error' && fetchState.errorMsg && (
                    <p className="text-[10px] text-amber-400/80 mt-1 leading-relaxed">
                      {fetchState.errorMsg}
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => testProvider(config)}
                    loading={isTesting}
                    className="flex-1 text-xs"
                  >
                    Test & Verify Key
                  </Button>
                  {!isActive && (
                    <Button
                      size="sm"
                      onClick={() => {
                        saveConfig(config);
                        setAsActive(provider.id);
                      }}
                      className="text-xs"
                    >
                      Use Engine
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Live AI Qualification Simulator */}
      <Card className="border-violet-500/30 bg-navy-800/80">
        <CardHeader className="border-b border-navy-700/80 pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-violet-400" />
                <h3 className="text-sm font-semibold text-slate-100">Live AI Qualification Simulator</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-300 border border-violet-500/20 uppercase font-mono">
                  Engine: {activeProvider}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Uses whichever model is currently selected in the active provider's card.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Lead Score</p>
                <p
                  className={`font-mono text-base font-bold ${
                    simScore >= 75 ? 'text-red-400' : simScore >= 45 ? 'text-amber-400' : 'text-blue-400'
                  }`}
                >
                  {simScore} / 100
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSimMessages([
                    {
                      sender: 'ai',
                      content:
                        'Hi there! 👋 Thanks for reaching out to Acme Corp. What is the biggest challenge your team is facing right now?',
                      score: 10,
                    },
                  ]);
                  setSimScore(10);
                }}
                className="text-xs text-slate-400"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          <div className="h-64 overflow-y-auto space-y-3 p-3 rounded-xl bg-navy-900/90 border border-navy-700/80">
            {simMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2.5 ${msg.sender === 'lead' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'ai' && (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-600 to-teal-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                    msg.sender === 'lead'
                      ? 'bg-violet-600 text-white rounded-br-none'
                      : 'bg-navy-800 border border-navy-700 text-slate-200 rounded-bl-none'
                  }`}
                >
                  {msg.content}
                </div>
                {msg.sender === 'lead' && (
                  <div className="w-6 h-6 rounded-full bg-navy-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5 text-slate-300" />
                  </div>
                )}
              </div>
            ))}
            {isSimulating && (
              <div className="flex gap-2 items-center text-xs text-slate-500 pl-8">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:0.4s]" />
                <span className="ml-1 text-[11px]">{activeProvider} is qualifying…</span>
              </div>
            )}
          </div>

          <form onSubmit={handleSimSend} className="flex gap-2">
            <input
              type="text"
              placeholder="Type a prospect reply (e.g., 'We have 50 reps and budget is approved')…"
              value={simInput}
              onChange={(e) => setSimInput(e.target.value)}
              disabled={isSimulating}
              className="flex-1 bg-navy-900 border border-navy-600 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            />
            <Button size="sm" type="submit" loading={isSimulating} disabled={!simInput.trim()}>
              <Send className="w-3.5 h-3.5" /> Send
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
