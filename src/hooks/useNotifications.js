'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';

export function useNotifications() {
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then(r => r.data),
    refetchInterval: 60000,   // Poll every 60 seconds
    staleTime: 30000,
    retry: 1,
  });

  const markReadMutation = useMutation({
    mutationFn: (ids) => api.put('/notifications', { ids }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  return {
    notifications: data?.notifications || [],
    unreadCount: data?.unreadCount || 0,
    markRead: markReadMutation.mutate,
  };
}
