'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

function showBrowserNotification(title, body) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const notif = new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `ems-${Date.now()}`,
      requireInteraction: false,
      silent: false,
    });

    notif.onclick = () => {
      window.focus();
      notif.close();
    };

    setTimeout(() => notif.close(), 8000);
  } catch {
    // Fallback: some browsers don't support Notification constructor in workers
  }
}

export function useBrowserNotifications() {
  const prevCountRef = useRef(null);
  const initializedRef = useRef(false);

  // Request permission once
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const { data } = useQuery({
    queryKey: ['unread-count'],
    queryFn: () => api.get('/notifications?unread=true&limit=5').then(r => r.data),
    refetchInterval: 8000,
  });

  useEffect(() => {
    if (!data) return;

    const currentCount = data.unreadCount || 0;

    // Skip the first load (don't alert on existing notifications)
    if (!initializedRef.current) {
      initializedRef.current = true;
      prevCountRef.current = currentCount;
      return;
    }

    // Only trigger when count INCREASES (new notification arrived)
    if (prevCountRef.current !== null && currentCount > prevCountRef.current) {
      const latest = data.notifications?.[0];
      const title = latest?.title || 'New Notification';
      const message = latest?.message || '';

      // In-app toast - prominent with custom styling per type
      const typeEmoji = {
        'task-approved': '✅',
        'task-rejected': '❌',
        'new-comment': '💬',
        'announcement': '📢',
        'break-available': '☕',
      };

      const emoji = typeEmoji[latest?.type] || '🔔';

      toast(
        (t) => (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', maxWidth: '300px' }}>
            <span style={{ fontSize: '20px', lineHeight: 1 }}>{emoji}</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '2px' }}>{title}</div>
              {message && <div style={{ fontSize: '12px', opacity: 0.7, lineHeight: 1.3 }}>{message}</div>}
            </div>
          </div>
        ),
        { duration: 6000 }
      );

      // Browser notification
      showBrowserNotification(title, message);
    }

    prevCountRef.current = currentCount;
  }, [data]);

  return { unreadCount: data?.unreadCount || 0 };
}
