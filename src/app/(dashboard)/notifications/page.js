'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Bell, CheckCheck, CheckCircle2, XCircle, MessageSquare, Megaphone, Coffee } from 'lucide-react';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import EmptyState from '@/components/shared/EmptyState';
import { PageSkeleton } from '@/components/shared/LoadingSkeleton';
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

const iconMap = {
  'task-approved': { icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30' },
  'task-rejected': { icon: XCircle, color: 'text-red-500 bg-red-50 dark:bg-red-900/30' },
  'new-comment': { icon: MessageSquare, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/30' },
  'announcement': { icon: Megaphone, color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/30' },
  'break-available': { icon: Coffee, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/30' },
};

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications?limit=50').then(r => r.data),
  });

  const readAllMutation = useMutation({
    mutationFn: () => api.put('/notifications', { action: 'read-all' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });

  const readMutation = useMutation({
    mutationFn: (id) => api.put('/notifications', { action: 'read', notificationId: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });

  if (isLoading) return <PageSkeleton />;

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  return (
    <div className="space-y-6">
      {unreadCount > 0 && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => readAllMutation.mutate()}>
            <CheckCheck className="h-4 w-4 mr-1" /> Mark All Read
          </Button>
        </div>
      )}

      {notifications.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications" description="You're all caught up" />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const config = iconMap[n.type] || iconMap['announcement'];
            const Icon = config.icon;
            return (
              <motion.div key={n._id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
                <Card
                  className={cn('cursor-pointer transition-colors', !n.isRead && 'bg-primary/[0.02] border-primary/20')}
                  onClick={() => !n.isRead && readMutation.mutate(n._id)}
                >
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', config.color)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={cn('text-sm', !n.isRead && 'font-medium')}>{n.title}</p>
                        {!n.isRead && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                      </div>
                      {n.message && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{n.message}</p>}
                      <p className="text-[10px] text-muted-foreground mt-1">{dayjs(n.createdAt).fromNow()}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
