import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Bot,
  Users,
  Calendar,
  Settings,
  Sparkles,
  ArrowRight,
  Flame,
} from 'lucide-react';
import { useLeadsData } from '@/hooks/useLeadsData';
import { useAgents } from '@/hooks/useAgents';
import type { Lead } from '@/types';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const { leads } = useLeadsData();
  const { agents } = useAgents();

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const staticActions = [
    { id: 'nav_agents', title: 'AI Workforce Studio', subtitle: 'Manage & deploy specialized AI bots', icon: Bot, href: '/agents', group: 'Navigation' },
    { id: 'nav_leads', title: 'Lead Pipeline', subtitle: 'View qualified prospects & conversations', icon: Users, href: '/leads', group: 'Navigation' },
    { id: 'nav_bookings', title: 'Scheduled Bookings', subtitle: 'View calendar appointments', icon: Calendar, href: '/bookings', group: 'Navigation' },
    { id: 'nav_settings', title: 'Workspace Settings', subtitle: 'Configure AI models & WhatsApp', icon: Settings, href: '/settings', group: 'Navigation' },
    { id: 'nav_guide', title: 'Features & Architecture Guide', subtitle: 'Read interactive platform documentation', icon: Sparkles, href: '/features', group: 'Navigation' },
  ];

  // Filtered lists
  const filteredActions = staticActions.filter(
    (a) =>
      a.title.toLowerCase().includes(query.toLowerCase()) ||
      a.subtitle.toLowerCase().includes(query.toLowerCase())
  );

  const filteredAgents = agents
    .filter((a) => a.name.toLowerCase().includes(query.toLowerCase()) || a.industry.toLowerCase().includes(query.toLowerCase()))
    .map((a) => ({
      id: `agent_${a.id}`,
      title: `${a.name} ${a.is_active ? '🟢' : '⏸️'}`,
      subtitle: `Industry: ${a.industry.toUpperCase()} • Tone: ${a.tone}`,
      icon: Bot,
      href: '/agents',
      group: 'AI Workers',
    }));

  const filteredLeads = (leads || [])
    .filter(
      (l: Lead) =>
        l.full_name?.toLowerCase().includes(query.toLowerCase()) ||
        l.contact?.toLowerCase().includes(query.toLowerCase())
    )
    .slice(0, 4)
    .map((l: Lead) => ({
      id: `lead_${l.id}`,
      title: `${l.full_name || 'Prospect'} (${l.score}/100)`,
      subtitle: `${l.contact} • Status: ${l.status.toUpperCase()}`,
      icon: l.score >= 75 ? Flame : Users,
      href: `/leads/${l.id}`,
      group: 'Leads',
    }));

  const allItems = [...filteredActions, ...filteredAgents, ...filteredLeads];

  const handleSelect = (href: string) => {
    setOpen(false);
    setQuery('');
    navigate(href);
  };

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Arrow navigation
  const handleKeyNav = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (allItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + allItems.length) % (allItems.length || 1));
    } else if (e.key === 'Enter' && allItems[selectedIndex]) {
      e.preventDefault();
      handleSelect(allItems[selectedIndex].href);
    }
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -10 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden"
              onKeyDown={handleKeyNav}
            >
              {/* Search input bar */}
              <div className="flex items-center px-4 py-3.5 border-b border-slate-800 bg-slate-900/90 gap-3">
                <Search className="w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Type a command, worker, or search leads... (ESC to close)"
                  className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 outline-none"
                  autoFocus
                />
                <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-400 font-mono">
                  ESC
                </kbd>
              </div>

              {/* Items List */}
              <div className="max-h-80 overflow-y-auto p-2 space-y-1">
                {allItems.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    No results found for "{query}"
                  </div>
                ) : (
                  allItems.map((item, idx) => {
                    const Icon = item.icon;
                    const isSelected = idx === selectedIndex;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item.href)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-colors ${
                          isSelected
                            ? 'bg-violet-600/20 border border-violet-500/30 text-white'
                            : 'hover:bg-slate-800/60 text-slate-300 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              isSelected
                                ? 'bg-violet-600 text-white'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-100 truncate flex items-center gap-2">
                              {item.title}
                              <span className="text-[10px] font-normal text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded border border-slate-700">
                                {item.group}
                              </span>
                            </p>
                            <p className="text-[11px] text-slate-400 truncate">{item.subtitle}</p>
                          </div>
                        </div>
                        <ArrowRight
                          className={`w-3.5 h-3.5 flex-shrink-0 transition-opacity ${
                            isSelected ? 'text-violet-400 opacity-100' : 'opacity-0'
                          }`}
                        />
                      </button>
                    );
                  })
                )}
              </div>

              {/* Palette Footer */}
              <div className="px-4 py-2 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono">
                    ↑↓
                  </kbd>{' '}
                  Navigate
                  <kbd className="ml-2 px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono">
                    ↵
                  </kbd>{' '}
                  Select
                </span>
                <span className="text-violet-400 font-medium">Qwalify Universal Command</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
