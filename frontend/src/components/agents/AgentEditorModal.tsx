import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { AIAgent } from '@/types/agent';
import { BotSetupWizard } from '@/components/onboarding/BotSetupWizard';

interface AgentEditorModalProps {
  agent: AIAgent | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (agentData: Partial<AIAgent>) => Promise<void>;
}

export function AgentEditorModal({ agent, isOpen, onClose, onSave }: AgentEditorModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-navy-950/85 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl bg-navy-900 border border-navy-700/80 rounded-3xl shadow-2xl shadow-black/80 overflow-hidden my-auto"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-navy-800/80 hover:bg-navy-700 text-slate-400 hover:text-slate-100 flex items-center justify-center transition-all border border-navy-700"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Wizard Content */}
          <div className="p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <BotSetupWizard
              initialAgent={agent}
              isStandalonePage={false}
              onComplete={async (saved) => {
                await onSave(saved);
                onClose();
              }}
            />
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
