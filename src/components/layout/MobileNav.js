'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  LayoutDashboard, CheckSquare, Clock, Users, Megaphone,
  Calendar, TrendingUp, BarChart3, Bell, User, LogOut, CalendarOff
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { NAV_ITEMS_ADMIN, NAV_ITEMS_EMPLOYEE, NAV_ITEMS_TEAM_LEAD, NAV_ITEMS_MANAGER } from '@/constants';
import { cn } from '@/lib/utils';

const iconMap = {
  LayoutDashboard, CheckSquare, Clock, Users, Megaphone,
  Calendar, TrendingUp, BarChart3, Bell, User, CalendarOff,
};

export default function MobileNav({ open, onClose }) {
  const pathname = usePathname();
  const { user, logout, isAdmin } = useAuth();
  const navItems = user?.role === 'admin' ? NAV_ITEMS_ADMIN : user?.role === 'manager' ? NAV_ITEMS_MANAGER : user?.role === 'team-lead' ? NAV_ITEMS_TEAM_LEAD : NAV_ITEMS_EMPLOYEE;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="px-4 pt-4 pb-2 border-b border-border">
          <SheetTitle className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-sm font-bold text-primary-foreground">E</span>
            </div>
            <span>EMS</span>
          </SheetTitle>
        </SheetHeader>

        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = iconMap[item.icon];
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                {Icon && <Icon className="h-4.5 w-4.5" />}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-medium text-primary">{user?.name?.charAt(0)?.toUpperCase()}</span>
            </div>
            <div>
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={() => { logout(); onClose(); }}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground w-full px-3 py-2 rounded-lg hover:bg-accent transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
