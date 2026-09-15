import { useState } from 'react';
import {
  MessageSquare,
  Sparkles,
  Zap,
  Clock,
  Building2,
  Calendar,
  ChevronRight,
  GripVertical,
  Plus,
  Minus,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AIProvidersTab } from '@/components/settings/AIProvidersTab';
import { ChannelsTab } from '@/components/settings/ChannelsTab';
import { CadenceSettingsTab } from '@/components/settings/CadenceSettingsTab';
import { BookingSettingsTab } from '@/components/settings/BookingSettingsTab';
import { TeamWorkspaceTab } from '@/components/settings/TeamWorkspaceTab';

type Tab = 'ai' | 'channels' | 'qualification' | 'cadence' | 'booking' | 'workspace';

const MOCK_QUESTIONS = [
  { id: 'q1', text: 'What is your biggest challenge right now?', weight: 20 },
  { id: 'q2', text: 'What is your team/company size?', weight: 15 },
  { id: 'q3', text: 'What is your budget range?', weight: 30 },
  { id: 'q4', text: 'What is your timeline to implement?', weight: 20 },
  { id: 'q5', text: 'Have you tried other solutions before?', weight: 15 },
];



function QualificationTab() {
  const [questions, setQuestions] = useState(MOCK_QUESTIONS);
  const [thresholds, setThresholds] = useState({ hot: 75, warm: 45 });

  return (
    <div className="space-y-6">
      {/* Threshold sliders */}
      <Card>
        <CardHeader>
          <p className="text-sm font-semibold text-slate-200">Score Thresholds</p>
          <p className="text-xs text-slate-500 mt-0.5">Define when a lead is classified as hot, warm, or cold</p>
        </CardHeader>
        <CardContent className="pt-0 space-y-5">
          <div>
            <div className="flex justify-between mb-1.5">
              <span className="text-sm text-slate-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-400" /> Hot threshold
              </span>
              <span className="font-mono text-sm text-red-400 font-bold">{thresholds.hot}+</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={thresholds.hot}
              onChange={(e) => setThresholds({ ...thresholds, hot: +e.target.value })}
              className="w-full accent-red-500"
            />
          </div>
          <div>
            <div className="flex justify-between mb-1.5">
              <span className="text-sm text-slate-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> Warm threshold
              </span>
              <span className="font-mono text-sm text-amber-400 font-bold">{thresholds.warm}+</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={thresholds.warm}
              onChange={(e) => setThresholds({ ...thresholds, warm: +e.target.value })}
              className="w-full accent-amber-500"
            />
          </div>
          <p className="text-xs text-slate-600">Scores below {thresholds.warm} are classified as cold</p>
        </CardContent>
      </Card>

      {/* Questions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-200">Qualification Questions</p>
              <p className="text-xs text-slate-500 mt-0.5">AI asks these in order during chat qualification</p>
            </div>
            <Button size="sm" variant="outline">
              <Plus className="w-3.5 h-3.5" /> Add Question
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          {questions.map((q, i) => (
            <div key={q.id} className="flex items-center gap-3 p-3 rounded-lg bg-navy-900/60 border border-navy-700 group">
              <GripVertical className="w-4 h-4 text-slate-700 group-hover:text-slate-500 cursor-grab flex-shrink-0" />
              <span className="w-5 h-5 rounded-full bg-violet-600/20 text-violet-400 text-xs flex items-center justify-center font-bold flex-shrink-0">
                {i + 1}
              </span>
              <p className="text-sm text-slate-300 flex-1 min-w-0">{q.text}</p>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-slate-500 font-mono">{q.weight}pts</span>
                <button
                  onClick={() => setQuestions(questions.filter((qq) => qq.id !== q.id))}
                  className="w-5 h-5 rounded flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <Minus className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function CadenceTab() {
  return <CadenceSettingsTab />;
}

function WorkspaceTab() {
  return <TeamWorkspaceTab />;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('ai');

  const TABS: { id: Tab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'ai', label: 'AI Providers', icon: <Sparkles className="w-4 h-4" />, badge: 'BYO-API' },
    { id: 'channels', label: 'Channels', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'qualification', label: 'Qualification', icon: <Zap className="w-4 h-4" /> },
    { id: 'cadence', label: 'Follow-up Cadence', icon: <Clock className="w-4 h-4" /> },
    { id: 'booking', label: 'Booking & Calendar', icon: <Calendar className="w-4 h-4" /> },
    { id: 'workspace', label: 'Workspace', icon: <Building2 className="w-4 h-4" /> },
  ];

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Tab sidebar */}
        <div className="w-full md:w-52 flex-shrink-0 space-y-1">
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
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-violet-500/20 text-violet-400 font-mono ml-auto mr-1">
                  {tab.badge}
                </span>
              )}
              {activeTab === tab.id && !tab.badge && (
                <ChevronRight className="w-3.5 h-3.5 ml-auto text-violet-400" />
              )}
            </button>
          ))}
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
            {activeTab === 'channels' && <ChannelsTab />}
            {activeTab === 'qualification' && <QualificationTab />}
            {activeTab === 'cadence' && <CadenceTab />}
            {activeTab === 'booking' && <BookingSettingsTab />}
            {activeTab === 'workspace' && <WorkspaceTab />}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
