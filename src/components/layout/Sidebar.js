'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, CheckSquare, Clock, Users, Megaphone,
  Calendar, TrendingUp, BarChart3, Bell, User, ChevronLeft, LogOut, CalendarOff, Building2, Coffee, FileText
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { NAV_ITEMS_ADMIN, NAV_ITEMS_EMPLOYEE, NAV_ITEMS_TEAM_LEAD, NAV_ITEMS_MANAGER } from '@/constants';
import { cn } from '@/lib/utils';

const iconMap = {
  LayoutDashboard, CheckSquare, Clock, Users, Megaphone,
  Calendar, TrendingUp, BarChart3, Bell, User, CalendarOff, Building2, Coffee, FileText,
};

export default function Sidebar({ collapsed, onToggle }) {
  const pathname = usePathname();
  const { user, logout, isAdmin } = useAuth();
  const navItems = user?.role === 'admin' ? NAV_ITEMS_ADMIN : user?.role === 'manager' ? NAV_ITEMS_MANAGER : user?.role === 'team-lead' ? NAV_ITEMS_TEAM_LEAD : NAV_ITEMS_EMPLOYEE;

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 256 }}
      transition={{ duration: 0.12, ease: 'easeOut' }}
      className="hidden md:flex flex-col h-screen fixed left-0 top-0 z-40"
      style={{ background: 'var(--sidebar)', color: 'var(--sidebar-foreground)' }}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-white/10">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3"
            >
              <img src="/logo.png" alt="Med Billing RCM" className="h-8 w-auto" />
            </motion.div>
          )}
        </AnimatePresence>
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-[#528532] flex items-center justify-center mx-auto">
            <span className="text-sm font-bold text-white">M</span>
          </div>
        )}
        <button
          onClick={onToggle}
          className="p-1.5 rounded-md hover:bg-accent text-muted-foreground transition-colors hidden lg:flex"
        >
          <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = iconMap[item.icon];
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-[#528532]/20 text-[#9cce7e]'
                  : 'text-[var(--sidebar-foreground)] hover:bg-white/5 hover:text-white',
                collapsed && 'justify-center px-2'
              )}
            >
              {Icon && <Icon className="h-4.5 w-4.5 shrink-0" />}
              <AnimatePresence mode="wait">
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="truncate"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-white/10 p-3">
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          <div className="w-8 h-8 rounded-full bg-[#528532]/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-medium text-[#9cce7e]">
              {user?.name?.charAt(0)?.toUpperCase()}
            </span>
          </div>
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 min-w-0"
              >
                <p className="text-sm font-medium truncate text-white">{user?.name}</p>
                <p className="text-xs text-[var(--sidebar-foreground)] capitalize">{user?.role?.replace('-', ' ')}</p>
              </motion.div>
            )}
          </AnimatePresence>
          {!collapsed && (
            <button onClick={logout} className="p-1.5 rounded-md hover:bg-white/10 text-[var(--sidebar-foreground)]">
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
