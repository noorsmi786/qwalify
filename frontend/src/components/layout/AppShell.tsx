import { useState } from 'react';
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
  Menu,
  X,
  Bot,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';

export const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/agents', label: 'AI Workers', icon: Bot },
  { path: '/leads', label: 'Leads', icon: Users },
  { path: '/bookings', label: 'Appointments', icon: Calendar },
  { path: '/settings', label: 'Settings', icon: Settings },
  { path: '/features', label: 'Features & Guide', icon: BookOpen },
];

export function Sidebar() {
  const location = useLocation();
  const { collapsed, toggle } = {
    collapsed: useUIStore((s) => s.sidebarCollapsed),
    toggle: useUIStore((s) => s.toggleSidebar),
  };
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
      className="hidden md:flex relative flex-col h-full bg-navy-950 border-r border-navy-700 sidebar-glow flex-shrink-0 overflow-hidden z-20"
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-navy-700 flex-shrink-0">
        <Link to="/dashboard" className="flex items-center gap-2 min-w-0">
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
        </Link>
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
            <p className="text-sm font-semibold text-slate-200 truncate mt-0.5">{tenant?.name || 'My Workspace'}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
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
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
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
                <p className="text-xs font-medium text-slate-300 truncate">{user?.full_name || 'User'}</p>
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
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </motion.aside>
  );
}

export function Navbar() {
  const location = useLocation();
  const { user, tenant, logout } = useAuthStore();
  const navigate = useNavigate();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const pageTitle: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/agents': 'AI Worker & Bot Studio',
    '/studio': 'AI Worker & Bot Studio',
    '/leads': 'Leads',
    '/bookings': 'Appointments',
    '/settings': 'Settings',
    '/features': 'Features & Guide',
  };

  const title =
    Object.entries(pageTitle).find(([key]) => location.pathname.startsWith(key))?.[1] ?? 'Qwalify';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <header className="h-16 flex items-center justify-between px-4 sm:px-6 border-b border-navy-700 bg-navy-900/80 backdrop-blur-sm flex-shrink-0 z-30">
        {/* Left: Mobile hamburger + Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-navy-800 transition-colors"
            aria-label="Open Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Link to="/dashboard" className="md:hidden flex items-center gap-1.5 mr-1">
              <div className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-white" />
              </div>
            </Link>
            <h1 className="text-base sm:text-lg font-semibold text-slate-100 truncate">{title}</h1>
          </div>
        </div>

        {/* Right: Notifications & Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-lg border border-navy-600 bg-navy-800 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:border-violet-500/30 transition-all">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-violet-500" />
          </button>
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-navy-600 bg-navy-800 text-xs sm:text-sm text-slate-300 font-medium">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full gradient-brand flex items-center justify-center text-[10px] sm:text-xs font-bold text-white">
              {user?.full_name?.[0] ?? 'U'}
            </div>
            <span className="hidden sm:inline max-w-[120px] truncate">{user?.full_name || 'User'}</span>
          </div>
        </div>
      </header>

      {/* Mobile Slide-Over Drawer Navigation */}
      <AnimatePresence>
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileDrawerOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="absolute top-0 bottom-0 left-0 w-72 bg-navy-950 border-r border-navy-800 p-5 flex flex-col justify-between shadow-2xl z-10"
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-navy-800">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center">
                      <Zap className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-bold text-base gradient-brand-text">Qwalify</span>
                  </div>
                  <button
                    onClick={() => setMobileDrawerOpen(false)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Workspace name */}
                <div className="py-3 border-b border-navy-800">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">Workspace</p>
                  <p className="text-sm font-semibold text-slate-200 truncate mt-0.5">{tenant?.name || 'Workspace'}</p>
                </div>

                {/* Nav Links */}
                <nav className="py-4 space-y-1">
                  {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
                    const active = location.pathname.startsWith(path);
                    return (
                      <Link
                        key={path}
                        to={path}
                        onClick={() => setMobileDrawerOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                          active
                            ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-navy-800/60'
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        {label}
                      </Link>
                    );
                  })}
                </nav>
              </div>

              {/* Bottom user & Logout */}
              <div className="pt-4 border-t border-navy-800 space-y-3">
                <div className="flex items-center gap-2 px-2">
                  <div className="w-7 h-7 rounded-full gradient-brand flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                    {user?.full_name?.[0] ?? 'U'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-300 truncate">{user?.full_name || 'User'}</p>
                    <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" /> Log Out
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

// Mobile Bottom Navigation Bar
export function MobileBottomNav() {
  const location = useLocation();
  const items = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/agents', label: 'Workers', icon: Bot },
    { path: '/leads', label: 'Leads', icon: Users },
    { path: '/bookings', label: 'Bookings', icon: Calendar },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-navy-950/95 backdrop-blur-md border-t border-navy-800 px-3 py-2 flex items-center justify-around">
      {items.map(({ path, label, icon: Icon }) => {
        const active = location.pathname.startsWith(path);
        return (
          <Link
            key={path}
            to={path}
            className={cn(
              'flex flex-col items-center gap-1 py-1 px-2 rounded-lg text-[10px] font-medium transition-colors',
              active ? 'text-violet-400' : 'text-slate-500 hover:text-slate-300'
            )}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </Link>
        );
      })}
    </div>
  );
}
