'use client';

import { useQuery } from '@tanstack/react-query';
import { Bell, Menu, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '@/providers/AuthProvider';
import api from '@/lib/axios';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/tasks': 'Tasks',
  '/attendance': 'Attendance',
  '/employees': 'Employees',
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

  const { data: notifData } = useQuery({
    queryKey: ['unread-count'],
    queryFn: () => api.get('/notifications?unread=true&limit=1').then(r => r.data),
    refetchInterval: 15000,
  });

  const unreadCount = notifData?.unreadCount || 0;
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
              <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 rounded-full bg-destructive text-[10px] font-medium text-white flex items-center justify-center">
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
