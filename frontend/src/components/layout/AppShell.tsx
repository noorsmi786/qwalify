import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Settings,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Zap,
  LogOut,
  Bell,
  ChevronDown,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/leads', label: 'Leads', icon: Users },
  { path: '/bookings', label: 'Appointments', icon: Calendar },
  { path: '/settings', label: 'Settings', icon: Settings },
  { path: '/features', label: 'Features & Guide', icon: BookOpen },
];

export function Sidebar() {
  const location = useLocation();
  const { collapsed, toggle } = { collapsed: useUIStore((s) => s.sidebarCollapsed), toggle: useUIStore((s) => s.toggleSidebar) };
  const { user, tenant } = useAuthStore();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 220 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="relative flex flex-col h-full bg-navy-950 border-r border-navy-700 sidebar-glow flex-shrink-0 overflow-hidden"
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-navy-700 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="font-bold text-base gradient-brand-text whitespace-nowrap"
              >
                Qwalify
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Tenant badge */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4 py-3 border-b border-navy-700"
          >
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">Workspace</p>
            <p className="text-sm font-semibold text-slate-200 truncate mt-0.5">{tenant?.name}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
          const active = location.pathname.startsWith(path);
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 group relative',
                active
                  ? 'bg-violet-600/15 text-violet-400 border border-violet-500/20'
                  : 'text-slate-500 hover:text-slate-200 hover:bg-navy-700/60'
              )}
            >
              {active && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute inset-0 rounded-lg bg-violet-600/10 border border-violet-500/20"
                  transition={{ duration: 0.2 }}
                />
              )}
              <Icon className={cn('w-5 h-5 flex-shrink-0 relative z-10', active ? 'text-violet-400' : '')} />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="relative z-10 whitespace-nowrap"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
              {collapsed && (
                <div className="absolute left-full ml-3 px-2 py-1 bg-navy-800 border border-navy-600 rounded-md text-xs text-slate-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                  {label}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-navy-700 p-3 space-y-1">
        <button
          onClick={handleLogout}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-red-400 hover:bg-red-500/5 transition-all',
            collapsed && 'justify-center'
          )}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                Log out
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 px-3 py-2"
            >
              <div className="w-7 h-7 rounded-full gradient-brand flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                {user?.full_name?.[0] ?? 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-300 truncate">{user?.full_name}</p>
                <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggle}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-navy-800 border border-navy-600 flex items-center justify-center text-slate-400 hover:text-violet-400 hover:border-violet-500/40 transition-all z-10"
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </button>
    </motion.aside>
  );
}

export function Navbar() {
  const location = useLocation();
  const { user } = useAuthStore();

  const pageTitle: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/leads': 'Leads',
    '/settings': 'Settings',
  };

  const title = Object.entries(pageTitle).find(([key]) =>
    location.pathname.startsWith(key)
  )?.[1] ?? 'Qwalify';

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-navy-700 bg-navy-900/80 backdrop-blur-sm flex-shrink-0">
      <h1 className="text-lg font-semibold text-slate-100">{title}</h1>
      <div className="flex items-center gap-3">
        <button className="relative w-9 h-9 rounded-lg border border-navy-600 bg-navy-800 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:border-violet-500/30 transition-all">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-violet-500" />
        </button>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-navy-600 bg-navy-800 hover:border-violet-500/30 transition-all">
          <div className="w-6 h-6 rounded-full gradient-brand flex items-center justify-center text-xs font-bold text-white">
            {user?.full_name?.[0] ?? 'U'}
          </div>
          <span className="text-sm text-slate-300 font-medium">{user?.full_name}</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
        </button>
      </div>
    </header>
  );
}
