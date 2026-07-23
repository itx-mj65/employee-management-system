'use client';

import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

export function useBrowserNotifications() {
  const queryClient = useQueryClient();
  const prevCountRef = useRef(null);

  // Request browser notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const { data } = useQuery({
    queryKey: ['unread-count'],
    queryFn: () => api.get('/notifications?unread=true&limit=5').then(r => r.data),
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (!data) return;

    const currentCount = data.unreadCount || 0;

    // Only trigger on NEW notifications (count increased)
    if (prevCountRef.current !== null && currentCount > prevCountRef.current) {
      const newCount = currentCount - prevCountRef.current;
      const latestNotif = data.notifications?.[0];

      // Show in-app toast
      toast(latestNotif?.title || `${newCount} new notification${newCount > 1 ? 's' : ''}`, {
        icon: '🔔',
        duration: 5000,
        style: {
          fontWeight: 600,
          fontSize: '14px',
        },
      });

      // Show browser notification
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification('EMS Notification', {
            body: latestNotif?.message || latestNotif?.title || 'You have a new notification',
            icon: '/favicon.ico',
            tag: 'ems-notif',
          });
        } catch (e) {
          // Browser notification failed silently
        }
      }
    }

    prevCountRef.current = currentCount;
  }, [data]);

  return { unreadCount: data?.unreadCount || 0 };
}
