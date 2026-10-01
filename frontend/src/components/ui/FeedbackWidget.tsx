import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquarePlus, X, Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

const FEEDBACK_TYPES = [
  { id: 'bug', label: '🐛 Bug', color: 'border-red-500/30 text-red-400 bg-red-500/10' },
  { id: 'suggestion', label: '💡 Suggestion', color: 'border-violet-500/30 text-violet-400 bg-violet-500/10' },
  { id: 'compliment', label: '🌟 Compliment', color: 'border-teal-500/30 text-teal-400 bg-teal-500/10' },
  { id: 'other', label: '💬 Other', color: 'border-slate-500/30 text-slate-400 bg-slate-500/10' },
];

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('suggestion');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const { user, tenant } = useAuthStore();

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          message: message.trim(),
          userEmail: user?.email || 'anonymous',
          userName: user?.full_name || '',
          workspace: tenant?.name || '',
          submittedAt: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error('Failed to send');
      setSent(true);
      setMessage('');
      setTimeout(() => {
        setSent(false);
        setOpen(false);
      }, 2500);
    } catch {
      toast.error('Could not send feedback. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="mb-3 w-80 rounded-2xl border border-navy-700 bg-navy-900 shadow-2xl shadow-black/40 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-navy-700 bg-navy-800/60">
              <p className="text-sm font-semibold text-slate-200">Share Feedback</p>
              <button
                onClick={() => { setOpen(false); setSent(false); }}
                className="text-slate-500 hover:text-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {sent ? (
              <div className="px-4 py-8 text-center">
                <p className="text-3xl mb-2">🙏</p>
                <p className="text-sm font-medium text-slate-200">Thanks for your feedback!</p>
                <p className="text-xs text-slate-500 mt-1">We'll review it shortly.</p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {/* Type selector */}
                <div className="grid grid-cols-2 gap-1.5">
                  {FEEDBACK_TYPES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setType(t.id)}
                      className={cn(
                        'px-2 py-1.5 rounded-lg text-xs font-medium border transition-all',
                        type === t.id ? t.color : 'border-navy-600 text-slate-500 bg-navy-800 hover:border-navy-500'
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Message */}
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your feedback, suggestion, or issue..."
                  rows={4}
                  className="w-full bg-navy-800/80 border border-navy-600 rounded-xl px-3 py-2.5 text-xs text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all leading-relaxed"
                />

                {/* Send */}
                <button
                  onClick={handleSubmit}
                  disabled={!message.trim() || sending}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-all"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {sending ? 'Sending...' : 'Send Feedback'}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trigger button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium shadow-lg shadow-violet-600/30 transition-all"
      >
        <MessageSquarePlus className="w-4 h-4" />
        Feedback
      </motion.button>
    </div>
  );
}
