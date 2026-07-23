'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Calendar, Trash2 } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import EmptyState from '@/components/shared/EmptyState';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { PageSkeleton } from '@/components/shared/LoadingSkeleton';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

export default function HolidaysPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState({ title: '', date: '', description: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => api.get('/holidays').then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/holidays', payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['holidays'] }); setShowCreate(false); setForm({ title: '', date: '', description: '' }); toast.success('Holiday added'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/holidays/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['holidays'] }); setDeleteId(null); toast.success('Holiday removed'); },
  });

  if (isLoading) return <PageSkeleton />;

  const holidays = data?.holidays || [];
  const upcoming = holidays.filter(h => dayjs(h.date).isAfter(dayjs().subtract(1, 'day')));
  const past = holidays.filter(h => dayjs(h.date).isBefore(dayjs()));

  return (
    <div className="space-y-6">
      {isAdmin && (
        <div className="flex justify-end">
          <Button onClick={() => setShowCreate(true)} size="sm"><Plus className="h-4 w-4 mr-1" /> Add Holiday</Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4" /> Upcoming Holidays</CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming holidays</p>
          ) : (
            <div className="space-y-3">
              {upcoming.map((h) => (
                <motion.div key={h._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex flex-col items-center justify-center">
                      <span className="text-xs font-medium text-primary">{dayjs(h.date).format('MMM')}</span>
                      <span className="text-lg font-bold text-primary leading-tight">{dayjs(h.date).format('D')}</span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{h.title}</p>
                      <p className="text-xs text-muted-foreground">{dayjs(h.date).format('dddd, MMMM D, YYYY')}</p>
                      {h.description && <p className="text-xs text-muted-foreground mt-0.5">{h.description}</p>}
                    </div>
                  </div>
                  {isAdmin && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(h._id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Holiday</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Holiday name" /></div>
            <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
            <div><Label>Description (optional)</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Delete Holiday" onConfirm={() => deleteMutation.mutate(deleteId)} loading={deleteMutation.isPending} destructive />
    </div>
  );
}
