import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Send, Sparkles, Loader2, Calendar, Bot, ArrowRight } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'ai' | 'lead';
  text: string;
  timestamp: string;
  bookingUrl?: string;
}

export default function EmbedChat() {
  const { agentId } = useParams<{ agentId: string }>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [leadName, setLeadName] = useState('');
  const [hasStarted, setHasStarted] = useState(false);
  const [score, setScore] = useState(15);
  const [bookingUrl, setBookingUrl] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleStartChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName.trim()) return;
    setHasStarted(true);
    setMessages([
      {
        id: 'msg_0',
        sender: 'ai',
        text: `Hey ${leadName.trim()}! 👋 Welcome! How can we help you today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');
    const userMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      sender: 'lead',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch('/api/widget/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: agentId || 'default',
          message: userText,
          leadName: leadName || 'Visitor',
          conversationId: 'web_' + (leadName ? leadName.toLowerCase().replace(/\s+/g, '_') : 'guest'),
          conversationHistory: messages.map((m) => ({
            sender: m.sender,
            content: m.text,
          })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setScore(data.score || 20);
        if (data.bookingUrl) setBookingUrl(data.bookingUrl);

        const aiMsg: ChatMessage = {
          id: 'msg_' + (Date.now() + 1),
          sender: 'ai',
          text: data.reply || 'Thanks for your message! Our team will get back to you shortly.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          bookingUrl: data.bookingTriggered ? (data.bookingUrl || bookingUrl || undefined) : undefined,
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        throw new Error('API error');
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: 'msg_' + Date.now(),
          sender: 'ai',
          text: "Thanks for providing that! Let me know if you'd like to schedule a time to speak with our team.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-950 text-slate-100 font-sans antialiased overflow-hidden">
      {/* Widget Header */}
      <header className="flex items-center justify-between px-4 py-3.5 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 shadow-md">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-violet-500/20">
              <Bot className="w-5 h-5" />
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-slate-100 leading-tight">AI Assistant</h1>
            <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Online & Active
            </p>
          </div>
        </div>

        {score >= 70 && (
          <span className="px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-semibold flex items-center gap-1">
            🔥 Priority
          </span>
        )}
      </header>

      {/* Main Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-gradient-to-b from-slate-950 via-slate-900/50 to-slate-950">
        {!hasStarted ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <div className="w-14 h-14 rounded-2xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-3 shadow-inner">
              <Sparkles className="w-7 h-7" />
            </div>
            <h2 className="text-base font-semibold text-slate-100 mb-1">Instant Concierge</h2>
            <p className="text-xs text-slate-400 max-w-xs mb-6">
              Ask about pricing, services, availability, or book an appointment directly with our team.
            </p>

            <form onSubmit={handleStartChat} className="w-full max-w-xs space-y-2.5">
              <input
                type="text"
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
                placeholder="Enter your name to start..."
                className="w-full bg-slate-900 border border-slate-700 focus:border-violet-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 outline-none transition-all shadow-inner"
                autoFocus
              />
              <button
                type="submit"
                disabled={!leadName.trim()}
                className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-violet-600/30 flex items-center justify-center gap-1.5 transition-all"
              >
                Start Chatting <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        ) : (
          <>
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'lead' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                    m.sender === 'lead'
                      ? 'bg-violet-600 text-white rounded-br-xs shadow-md shadow-violet-600/20'
                      : 'bg-slate-800 text-slate-200 border border-slate-700/60 rounded-bl-xs'
                  }`}
                >
                  <p>{m.text}</p>

                  {m.bookingUrl && (
                    <a
                      href={m.bookingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2.5 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-md transition-all"
                    >
                      <Calendar className="w-3.5 h-3.5" /> Schedule Appointment Now
                    </a>
                  )}
                </div>
                <span className="text-[9px] text-slate-500 mt-1 px-1">{m.timestamp}</span>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/80 border border-slate-700/50 rounded-2xl rounded-bl-xs w-20">
                <Loader2 className="w-3.5 h-3.5 text-violet-400 animate-spin" />
                <span className="text-[10px] text-slate-400">typing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Bar */}
      {hasStarted && (
        <form
          onSubmit={handleSendMessage}
          className="p-3 bg-slate-900/95 border-t border-slate-800 flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={loading}
            className="flex-1 bg-slate-800 border border-slate-700 focus:border-violet-500 rounded-xl px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white flex items-center justify-center transition-all shadow-md shadow-violet-600/20"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* Powered by Qwalify footer */}
      <footer className="py-1 px-4 text-center bg-slate-950 border-t border-slate-900">
        <span className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
          ⚡ Powered by <strong className="text-violet-400 font-semibold">Qwalify AI</strong>
        </span>
      </footer>
    </div>
  );
}
