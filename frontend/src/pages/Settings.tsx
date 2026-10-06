import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Building2,
  Calendar,
  ChevronRight,
  Webhook,
  Bot,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { AIProvidersTab } from '@/components/settings/AIProvidersTab';
import { BookingSettingsTab } from '@/components/settings/BookingSettingsTab';
import { TeamWorkspaceTab } from '@/components/settings/TeamWorkspaceTab';
import { IntegrationsTab } from '@/components/settings/IntegrationsTab';

type Tab = 'ai' | 'booking' | 'integrations' | 'workspace';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('workspace');

  const TABS: { id: Tab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'workspace', label: 'Account & Profile', icon: <Building2 className="w-4 h-4" /> },
    { id: 'ai', label: 'AI Model & Keys', icon: <Sparkles className="w-4 h-4" />, badge: 'BYO-API' },
    { id: 'booking', label: 'Booking & Calendar', icon: <Calendar className="w-4 h-4" /> },
    { id: 'integrations', label: 'Website Widget & Webhooks', icon: <Webhook className="w-4 h-4" /> },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Settings</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Manage your account, API keys, booking links, and website widgets.
        </p>
      </div>

      {/* Bot settings shortcut banner */}
      <div className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/20 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-600/20 flex items-center justify-center flex-shrink-0">
            <Bot className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-200">Looking for bot settings?</p>
            <p className="text-xs text-slate-400">Personality, Knowledge Base, Follow-up Rules, and Channels are in the "Your Bot" section.</p>
          </div>
        </div>
        <Link
          to="/bot/personality"
          className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600/15 hover:bg-violet-600/25 text-violet-300 text-xs font-semibold border border-violet-500/30 transition-all"
        >
          Go to Your Bot <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Tab sidebar */}
        <div className="w-full md:w-56 flex-shrink-0 space-y-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                activeTab === tab.id
                  ? 'bg-violet-600/15 text-violet-300 border border-violet-500/30 shadow-[0_0_15px_rgba(124,58,237,0.1)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-navy-800/40'
              }`}
            >
              {tab.icon}
              <span className="truncate">{tab.label}</span>
              {tab.badge && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-400 font-mono ml-auto mr-1">
                  {tab.badge}
                </span>
              )}
              {activeTab === tab.id && !tab.badge && (
                <ChevronRight className="w-3.5 h-3.5 ml-auto text-violet-400" />
              )}
            </button>
          ))}

          <div className="pt-4 border-t border-navy-700/60 mt-4">
            <Link
              to="/onboarding"
              className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-violet-600/15 hover:bg-violet-600/25 text-violet-300 border border-violet-500/30 transition-all text-center"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Launch Setup Wizard</span>
            </Link>
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 min-w-0">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
          >
            {activeTab === 'ai' && <AIProvidersTab />}
            {activeTab === 'booking' && <BookingSettingsTab />}
            {activeTab === 'integrations' && <IntegrationsTab />}
            {activeTab === 'workspace' && <TeamWorkspaceTab />}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
