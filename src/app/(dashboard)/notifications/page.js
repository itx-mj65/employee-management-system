'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Bell, CheckCheck, CheckCircle2, XCircle, MessageSquare,
  Megaphone, Coffee, Sparkles
} from 'lucide-react';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/shared/EmptyState';
import Pagination from '@/components/shared/Pagination';
import { PageSkeleton } from '@/components/shared/LoadingSkeleton';
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

const iconMap = {
  'task-approved': { icon: CheckCircle2, lightBg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-600 dark:text-emerald-400' },
  'task-rejected': { icon: XCircle, lightBg: 'bg-red-50 dark:bg-red-950/40', text: 'text-red-600 dark:text-red-400' },
  'new-comment': { icon: MessageSquare, lightBg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-600 dark:text-blue-400' },
  'announcement': { icon: Megaphone, lightBg: 'bg-violet-50 dark:bg-violet-950/40', text: 'text-violet-600 dark:text-violet-400' },
  'break-available': { icon: Coffee, lightBg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-600 dark:text-amber-400' },
};

export default function NotificationsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', page],
    queryFn: () => api.get('/notifications', { params: { page, limit: 30 } }).then(r => r.data),
  });

  const markAllMut = useMutation({
    mutationFn: () => api.put('/notifications', { ids: 'all' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markOneMut = useMutation({
    mutationFn: (id) => api.put('/notifications', { ids: [id] }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  if (isLoading) return <PageSkeleton />;

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  // Group by date
  const grouped = {};
  notifications.forEach(n => {
    const dateKey = dayjs(n.createdAt).format('YYYY-MM-DD');
    const label = dateKey === dayjs().format('YYYY-MM-DD') ? 'Today'
      : dateKey === dayjs().subtract(1, 'day').format('YYYY-MM-DD') ? 'Yesterday'
      : dayjs(n.createdAt).format('MMMM D, YYYY');
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(n);
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
        </p>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={() => markAllMut.mutate()} className="h-8 text-xs" disabled={markAllMut.isPending}>
            <CheckCheck className="h-3.5 w-3.5 mr-1.5" /> Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState icon={Sparkles} title="All caught up" description="Notifications for task approvals, comments, and announcements will show here." />
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
                    <motion.div key={n._id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.02 }}
                      onClick={() => !n.isRead && markOneMut.mutate(n._id)}
                      className={cn('flex items-start gap-3.5 p-3.5 rounded-xl transition-all cursor-pointer',
                        n.isRead ? 'hover:bg-muted/50' : 'bg-primary/[0.04] hover:bg-primary/[0.07] border border-primary/10')}>
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', config.lightBg)}>
                        <Icon className={cn('h-5 w-5', config.text)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn('text-sm leading-snug', !n.isRead && 'font-semibold')}>{n.title}</p>
                          {!n.isRead && <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse shrink-0 mt-1" />}
                        </div>
                        {n.message && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{n.message}</p>}
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

      <Pagination page={page} totalPages={data?.pagination?.pages} total={data?.pagination?.total} onPageChange={setPage} />
    </div>
  );
}
