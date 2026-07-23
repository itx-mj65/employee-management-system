'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Bell, CheckCheck, CheckCircle2, XCircle, MessageSquare,
  Megaphone, Coffee, UserPlus, ClipboardCheck, Sparkles
} from 'lucide-react';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/shared/EmptyState';
import { PageSkeleton } from '@/components/shared/LoadingSkeleton';
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

const iconMap = {
  'task-approved': { icon: CheckCircle2, bg: 'bg-emerald-500', lightBg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-600 dark:text-emerald-400' },
  'task-rejected': { icon: XCircle, bg: 'bg-red-500', lightBg: 'bg-red-50 dark:bg-red-950/40', text: 'text-red-600 dark:text-red-400' },
  'new-comment': { icon: MessageSquare, bg: 'bg-blue-500', lightBg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-600 dark:text-blue-400' },
  'announcement': { icon: Megaphone, bg: 'bg-violet-500', lightBg: 'bg-violet-50 dark:bg-violet-950/40', text: 'text-violet-600 dark:text-violet-400' },
  'break-available': { icon: Coffee, bg: 'bg-amber-500', lightBg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-600 dark:text-amber-400' },
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

  // Group by date
  const grouped = {};
  notifications.forEach(n => {
    const key = dayjs(n.createdAt).isToday?.()
      ? 'Today'
      : dayjs(n.createdAt).isYesterday?.()
        ? 'Yesterday'
        : dayjs(n.createdAt).format('MMMM D, YYYY');
    const dateKey = dayjs(n.createdAt).format('YYYY-MM-DD');
    const label = dateKey === dayjs().format('YYYY-MM-DD')
      ? 'Today'
      : dateKey === dayjs().subtract(1, 'day').format('YYYY-MM-DD')
        ? 'Yesterday'
        : dayjs(n.createdAt).format('MMMM D, YYYY');
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(n);
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={() => readAllMutation.mutate()} className="h-8 text-xs">
            <CheckCheck className="h-3.5 w-3.5 mr-1.5" /> Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="You're all caught up"
          description="When something happens — task approvals, new comments, announcements — it'll show up here."
        />
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([dateLabel, items]) => (
            <div key={dateLabel}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">{dateLabel}</p>
              <div className="space-y-1.5">
                {items.map((n, idx) => {
                  const config = iconMap[n.type] || iconMap['announcement'];
                  const Icon = config.icon;
                  return (
                    <motion.div
                      key={n._id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      onClick={() => !n.isRead && readMutation.mutate(n._id)}
                      className={cn(
                        'flex items-start gap-3.5 p-3.5 rounded-xl transition-all cursor-pointer group',
                        n.isRead
                          ? 'hover:bg-muted/50'
                          : 'bg-primary/[0.04] hover:bg-primary/[0.07] border border-primary/10'
                      )}
                    >
                      {/* Icon */}
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', config.lightBg)}>
                        <Icon className={cn('h-4.5 w-4.5', config.text)} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn('text-sm leading-snug', !n.isRead && 'font-semibold')}>
                            {n.title}
                          </p>
                          <div className="flex items-center gap-2 shrink-0">
                            {!n.isRead && (
                              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                            )}
                          </div>
                        </div>
                        {n.message && (
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{n.message}</p>
                        )}
                        <p className="text-[11px] text-muted-foreground/60 mt-1.5">{dayjs(n.createdAt).fromNow()}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
