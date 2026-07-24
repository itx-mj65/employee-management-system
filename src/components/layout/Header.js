'use client';

import { Bell, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '@/providers/AuthProvider';
import { useBrowserNotifications } from '@/hooks/useNotifications';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/tasks': 'Tasks',
  '/attendance': 'Attendance',
  '/leaves': 'Leave Management',
  '/employees': 'Employees',
  '/departments': 'Departments',
  '/announcements': 'Announcements',
  '/holidays': 'Holiday Calendar',
  '/performance': 'Performance',
  '/analytics': 'Analytics',
  '/notifications': 'Notifications',
  '/profile': 'Profile',
};

export default function Header({ onMenuToggle }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const { unreadCount } = useBrowserNotifications();
  const title = pageTitles[pathname] || 'EMS';

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border bg-card/80 backdrop-blur-md flex items-center justify-between px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuToggle}>
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Link href="/notifications">
          <Button variant="ghost" size="icon" className="relative rounded-lg">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-destructive text-[10px] font-bold text-white flex items-center justify-center px-1 animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
        </Link>
        <Link href="/profile" className="hidden sm:flex items-center gap-2 ml-1">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-xs font-medium text-primary">{user?.name?.charAt(0)?.toUpperCase()}</span>
          </div>
        </Link>
      </div>
    </header>
  );
}
