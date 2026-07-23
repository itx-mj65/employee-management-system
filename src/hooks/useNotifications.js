'use client';

import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import toast from 'react-hot-toast';

function showBrowserNotification(title, body) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    const n = new Notification(title, { body, icon: '/favicon.ico', tag: `ems-${Date.now()}` });
    n.onclick = () => { window.focus(); n.close(); };
    setTimeout(() => n.close(), 8000);
  } catch { /* ignore */ }
}

export function useBrowserNotifications() {
  const prevCountRef = useRef(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const { data } = useQuery({
    queryKey: ['unread-count'],
    queryFn: () => api.get('/notifications?unread=true&limit=3').then(r => r.data),
    refetchInterval: 30000,   // Poll every 30 seconds (was 8s — way too aggressive)
    staleTime: 20000,         // Fresh for 20 seconds
    gcTime: 60000,
  });

  useEffect(() => {
    if (!data) return;
    const count = data.unreadCount || 0;

    if (!initializedRef.current) {
      initializedRef.current = true;
      prevCountRef.current = count;
      return;
    }

    if (prevCountRef.current !== null && count > prevCountRef.current) {
      const latest = data.notifications?.[0];
      const title = latest?.title || 'New Notification';
      const message = latest?.message || '';
      const emoji = { 'task-approved': '✅', 'task-rejected': '❌', 'new-comment': '💬', 'announcement': '📢', 'break-available': '☕' }[latest?.type] || '🔔';

      toast((t) => (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', maxWidth: '300px' }}>
          <span style={{ fontSize: '20px', lineHeight: 1 }}>{emoji}</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '2px' }}>{title}</div>
            {message && <div style={{ fontSize: '12px', opacity: 0.7, lineHeight: 1.3 }}>{message}</div>}
          </div>
        </div>
      ), { duration: 5000 });

      showBrowserNotification(title, message);
    }

    prevCountRef.current = count;
  }, [data]);

  return { unreadCount: data?.unreadCount || 0 };
}
