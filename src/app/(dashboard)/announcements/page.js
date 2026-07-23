'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Megaphone, Edit3, Trash2 } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import EmptyState from '@/components/shared/EmptyState';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { PageSkeleton } from '@/components/shared/LoadingSkeleton';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

export default function AnnouncementsPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState({ title: '', content: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => api.get('/announcements').then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/announcements', payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['announcements'] }); setShowCreate(false); setForm({ title: '', content: '' }); toast.success('Announcement created'); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/announcements/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['announcements'] }); setEditItem(null); toast.success('Updated'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/announcements/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['announcements'] }); setDeleteId(null); toast.success('Deleted'); },
  });

  if (isLoading) return <PageSkeleton />;

  const announcements = data?.announcements || [];

  return (
    <div className="space-y-6">
      {isAdmin && (
        <div className="flex justify-end">
          <Button onClick={() => setShowCreate(true)} size="sm"><Plus className="h-4 w-4 mr-1" /> New Announcement</Button>
        </div>
      )}

      {announcements.length === 0 ? (
        <EmptyState icon={Megaphone} title="No announcements" description="No announcements have been posted yet" />
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <motion.div key={a._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardContent className="p-5">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm mb-1">{a.title}</h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.content}</p>
                      <p className="text-xs text-muted-foreground mt-3">
                        By {a.createdBy?.name} · {dayjs(a.createdAt).format('MMM D, YYYY')}
                      </p>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1 ml-3">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditItem(a)}>
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(a._id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Announcement</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Content</Label><Textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} rows={4} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending}>Post</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Announcement</DialogTitle></DialogHeader>
          {editItem && (
            <div className="space-y-4">
              <div><Label>Title</Label><Input value={editItem.title} onChange={e => setEditItem({ ...editItem, title: e.target.value })} /></div>
              <div><Label>Content</Label><Textarea value={editItem.content} onChange={e => setEditItem({ ...editItem, content: e.target.value })} rows={4} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
            <Button onClick={() => updateMutation.mutate({ id: editItem._id, title: editItem.title, content: editItem.content })} disabled={updateMutation.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Delete Announcement" onConfirm={() => deleteMutation.mutate(deleteId)} loading={deleteMutation.isPending} destructive />
    </div>
  );
}
