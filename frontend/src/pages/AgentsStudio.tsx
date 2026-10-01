import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Plus,
  Sparkles,
  Sliders,
  Play,
  Pause,
  Trash2,
  Calendar,
  Activity,
  Building2,
  GraduationCap,
  Zap,
  Car,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAgents } from '@/hooks/useAgents';
import { AgentEditorModal } from '@/components/agents/AgentEditorModal';
import { INDUSTRY_TEMPLATES } from '@/lib/ai/industryTemplates';
import type { AIAgent, IndustryType } from '@/types/agent';
import { cn } from '@/lib/utils';

export default function AgentsStudio() {
  const { agents, createAgent, updateAgent, deleteAgent, toggleActiveAgent } = useAgents();

  const [selectedIndustry, setSelectedIndustry] = useState<string>('all');
  const [editingAgent, setEditingAgent] = useState<AIAgent | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Filter agents by industry
  const filteredAgents =
    selectedIndustry === 'all'
      ? agents
      : agents.filter((a) => a.industry === selectedIndustry);

  const handleCreateNew = () => {
    setEditingAgent(null);
    setIsEditorOpen(true);
  };

  const handleEdit = (agent: AIAgent) => {
    setEditingAgent(agent);
    setIsEditorOpen(true);
  };

  const handleSave = async (agentData: Partial<AIAgent>) => {
    if (editingAgent) {
      await updateAgent(editingAgent.id, agentData);
    } else {
      await createAgent(agentData as any);
    }
  };

  const getIndustryIcon = (ind: IndustryType) => {
    switch (ind) {
      case 'dental':
        return <Activity className="w-4 h-4 text-teal-400" />;
      case 'real_estate':
        return <Building2 className="w-4 h-4 text-violet-400" />;
      case 'school':
        return <GraduationCap className="w-4 h-4 text-amber-400" />;
      case 'salon':
        return <Sparkles className="w-4 h-4 text-pink-400" />;
      case 'b2b':
        return <Zap className="w-4 h-4 text-violet-400" />;
      case 'auto':
        return <Car className="w-4 h-4 text-blue-400" />;
      default:
        return <Bot className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-violet-600/10 border border-violet-500/20 text-violet-400">
              <Bot className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-100">AI Worker & Bot Studio</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Create, train, and manage specialized qualification droids tailored to each client or niche.
          </p>
        </div>

        <Button onClick={handleCreateNew} className="text-xs sm:text-sm">
          <Plus className="w-4 h-4" /> Create AI Worker
        </Button>
      </div>

      {/* ─── Industry Filter Bar ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-navy-800">
        {[
          { id: 'all', label: 'All Workers', icon: null },
          { id: 'dental', label: '🦷 Dental & Medical', icon: null },
          { id: 'real_estate', label: '🏡 Real Estate', icon: null },
          { id: 'school', label: '🎓 Schools & Tutors', icon: null },
          { id: 'salon', label: '✂️ Salons & Spas', icon: null },
          { id: 'b2b', label: '💼 B2B & Agency', icon: null },
          { id: 'auto', label: '🚗 Automotive', icon: null },
        ].map((chip) => (
          <button
            key={chip.id}
            onClick={() => setSelectedIndustry(chip.id)}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all border',
              selectedIndustry === chip.id
                ? 'bg-violet-600/20 border-violet-500/50 text-violet-200 shadow-md shadow-violet-600/10'
                : 'bg-navy-800/60 border-navy-700 text-slate-400 hover:text-slate-200 hover:border-navy-600'
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* ─── Workers Grid ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <AnimatePresence>
          {filteredAgents.map((agent) => {
            const tmpl = INDUSTRY_TEMPLATES[agent.industry] || INDUSTRY_TEMPLATES.custom;
            return (
              <motion.div
                key={agent.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Card
                  glow={agent.is_active}
                  className={cn(
                    'h-full flex flex-col justify-between transition-all duration-300 hover:border-violet-500/40 p-5 space-y-4',
                    agent.is_active ? 'border-violet-500/30' : 'opacity-85'
                  )}
                >
                  {/* Top: Avatar, Name, Status toggle */}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-navy-800 border border-navy-700 flex items-center justify-center flex-shrink-0">
                          {getIndustryIcon(agent.industry)}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-slate-100 truncate">{agent.name}</h3>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-md border', tmpl.color)}>
                              {tmpl.badge}
                            </span>
                            <span className="text-[10px] text-slate-400 capitalize">· {agent.tone}</span>
                          </div>
                        </div>
                      </div>

                      {/* Active Status Toggle Button */}
                      <button
                        onClick={() => toggleActiveAgent(agent.id)}
                        className={cn(
                          'p-1.5 rounded-lg border text-xs transition-all',
                          agent.is_active
                            ? 'bg-teal-500/10 border-teal-500/30 text-teal-400 hover:bg-teal-500/20'
                            : 'bg-navy-800 border-navy-700 text-slate-500 hover:text-slate-300'
                        )}
                        title={agent.is_active ? 'Click to pause' : 'Click to activate'}
                      >
                        {agent.is_active ? <Play className="w-3.5 h-3.5 fill-teal-400" /> : <Pause className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                      {tmpl.tagline}
                    </p>
                  </div>

                  {/* Middle specs badge strip */}
                  <div className="grid grid-cols-3 gap-2 py-2.5 border-y border-navy-700/60 text-center">
                    <div className="bg-navy-900/60 rounded-lg p-1.5 border border-navy-800">
                      <p className="text-[10px] text-slate-500 font-medium">Knowledge</p>
                      <p className="text-xs font-mono font-bold text-slate-200 mt-0.5">
                        {agent.knowledge_base?.length || 0} Cards
                      </p>
                    </div>
                    <div className="bg-navy-900/60 rounded-lg p-1.5 border border-navy-800">
                      <p className="text-[10px] text-slate-500 font-medium">Questions</p>
                      <p className="text-xs font-mono font-bold text-slate-200 mt-0.5">
                        {agent.qualification_rules?.length || 0} Rules
                      </p>
                    </div>
                    <div className="bg-navy-900/60 rounded-lg p-1.5 border border-navy-800">
                      <p className="text-[10px] text-slate-500 font-medium">Hot Score</p>
                      <p className="text-xs font-mono font-bold text-teal-400 mt-0.5">
                        {agent.hot_threshold}+ pts
                      </p>
                    </div>
                  </div>

                  {/* Bottom: Booking URL & Action Buttons */}
                  <div className="space-y-3 pt-1">
                    {agent.booking_url && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono truncate bg-navy-900/40 px-2.5 py-1.5 rounded-lg border border-navy-800">
                        <Calendar className="w-3 h-3 text-teal-400 flex-shrink-0" />
                        <span className="truncate">{agent.booking_url.replace('https://', '')}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleEdit(agent)}
                        className="flex-1 text-xs"
                      >
                        <Sliders className="w-3.5 h-3.5" /> Configure & Test
                      </Button>
                      <button
                        onClick={() => deleteAgent(agent.id)}
                        className="p-2 rounded-lg border border-navy-700 bg-navy-800/80 text-slate-500 hover:text-red-400 hover:border-red-500/30 transition-colors"
                        title="Delete worker"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* ─── Editor Modal ─────────────────────────────────────────────────── */}
      <AgentEditorModal
        agent={editingAgent}
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}
