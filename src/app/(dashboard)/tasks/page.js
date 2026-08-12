'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Plus, Search, CheckCircle2, ChevronDown, Send, Edit3, Clock,
  Trash2, Play, Pause, RotateCcw, ThumbsUp, X, Timer, User as UserIcon
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useEmployeeList } from '@/hooks/useSharedData';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import SimpleSelect from '@/components/shared/SimpleSelect';
import Pagination from '@/components/shared/Pagination';
import EmptyState from '@/components/shared/EmptyState';
import { PageSkeleton } from '@/components/shared/LoadingSkeleton';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { cn } from '@/lib/utils';

const STATUS_COLORS = {
  assigned: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  accepted: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  submitted: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  returned: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const PRIORITY_COLORS = { low: 'text-slate-500', medium: 'text-blue-500', high: 'text-orange-500', urgent: 'text-red-500' };

function formatTime(s) { const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); return `${h}h ${m}m`; }

export default function TasksPage() {
  const { user, role, isAdmin } = useAuth();
  const qc = useQueryClient();
  const canAssign = isAdmin || role === 'manager' || role === 'team-lead';

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [empFilter, setEmpFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', deadline: '', assignedTo: '' });
  const [actionDialog, setActionDialog] = useState(null);
  const [actionRemarks, setActionRemarks] = useState('');
  const [adjustHours, setAdjustHours] = useState('');

  const { employees } = useEmployeeList();
  const empOpts = [{ value: 'all', label: 'All' }, ...employees.map(e => ({ value: e._id, label: e.name }))];
  const statusOpts = [{ value: '', label: 'All Status' }, ...Object.keys(STATUS_COLORS).map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))];

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', statusFilter, empFilter, page],
    queryFn: () => api.get('/tasks', { params: { status: statusFilter || undefined, employeeId: empFilter, page, limit: 20 } }).then(r => r.data),
  });

  const createMut = useMutation({
    mutationFn: (p) => api.post('/tasks', p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); setShowCreate(false); setForm({ title: '', description: '', priority: 'medium', deadline: '', assignedTo: '' }); toast.success('Task assigned'); },
  });

  const actionMut = useMutation({
    mutationFn: ({ id, ...body }) => api.put(`/tasks/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); setActionDialog(null); setActionRemarks(''); setAdjustHours(''); toast.success('Done'); },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/tasks/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); toast.success('Deleted'); },
  });

  if (isLoading) return <PageSkeleton />;
  const tasks = data?.tasks || [];
  const pagination = data?.pagination || {};

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <SimpleSelect value={statusFilter} onChange={v => { setStatusFilter(v); setPage(1); }} options={statusOpts} className="w-36 h-9" />
          {canAssign && <SimpleSelect value={empFilter} onChange={v => { setEmpFilter(v); setPage(1); }} options={empOpts} className="w-40 h-9" />}
        </div>
        {canAssign && (
          <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" />Assign Task</Button>
        )}
      </div>

      {/* Task List */}
      {tasks.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="No tasks" description="No tasks found" />
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => {
            const isExpanded = expandedId === task._id;
            const isOwner = task.userId?._id === user?._id;
            const prodSec = task.timerStartedAt
              ? (task.productiveSeconds || 0) + Math.floor((Date.now() - new Date(task.timerStartedAt).getTime()) / 1000)
              : (task.productiveSeconds || 0);

            return (
              <Card key={task._id} className={cn('overflow-hidden transition-all', task.timerStartedAt && 'ring-1 ring-purple-400')}>
                <div className="p-4 cursor-pointer hover:bg-muted/20 transition-colors" onClick={() => setExpandedId(isExpanded ? null : task._id)}>
                  <div className="flex items-center gap-3">
                    <div className={cn('w-1 h-10 rounded-full', PRIORITY_COLORS[task.priority]?.replace('text-', 'bg-'))} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-sm truncate">{task.title}</span>
                        <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold', STATUS_COLORS[task.status])}>{task.status}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><UserIcon className="h-3 w-3" />{task.userId?.name}</span>
                        {task.assignedBy && <span>by {task.assignedBy.name}</span>}
                        {prodSec > 0 && <span className="flex items-center gap-1 text-purple-500 font-medium"><Timer className="h-3 w-3" />{formatTime(prodSec)}</span>}
                        {task.timerStartedAt && <span className="text-[10px] text-emerald-500 animate-pulse">● LIVE</span>}
                      </div>
                    </div>
                    <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform shrink-0', isExpanded && 'rotate-180')} />
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t px-4 pb-4 pt-3 space-y-3">
                    {task.description && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{task.description}</p>}

                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>Priority: <strong className={PRIORITY_COLORS[task.priority]}>{task.priority}</strong></span>
                      {task.deadline && <span>Deadline: <strong>{dayjs(task.deadline).format('MMM D')}</strong></span>}
                      <span>Productive: <strong className="text-purple-500">{formatTime(prodSec)}</strong></span>
                      <span>Created: {dayjs(task.createdAt).format('MMM D, h:mm A')}</span>
                    </div>

                    {/* Approval timeline */}
                    {task.approvalChain?.length > 0 && (
                      <div className="space-y-1.5 pt-2">
                        <p className="text-xs font-semibold text-muted-foreground">Timeline</p>
                        {task.approvalChain.map((s, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className={cn('w-1.5 h-1.5 rounded-full',
                              s.action === 'approved' ? 'bg-emerald-500' : s.action === 'returned' ? 'bg-orange-500' : s.action === 'rejected' ? 'bg-red-500' : 'bg-blue-500')} />
                            <span className="font-medium">{s.userId?.name || s.role}</span>
                            <span className="text-muted-foreground">{s.action}</span>
                            {s.remarks && <span className="text-muted-foreground italic">— {s.remarks}</span>}
                            <span className="text-muted-foreground ml-auto">{dayjs(s.timestamp).format('MMM D, h:mm A')}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {/* Employee actions */}
                      {isOwner && task.status === 'assigned' && (
                        <Button size="sm" className="h-8 text-xs" onClick={() => actionMut.mutate({ id: task._id, action: 'accept' })} disabled={actionMut.isPending}>
                          <Play className="h-3 w-3 mr-1" />Accept & Start
                        </Button>
                      )}
                      {isOwner && task.status === 'returned' && (
                        <Button size="sm" className="h-8 text-xs" onClick={() => actionMut.mutate({ id: task._id, action: 'accept' })} disabled={actionMut.isPending}>
                          <Play className="h-3 w-3 mr-1" />Resume Work
                        </Button>
                      )}
                      {isOwner && task.status === 'accepted' && (
                        <Button size="sm" className="h-8 text-xs bg-amber-600 hover:bg-amber-700" onClick={() => actionMut.mutate({ id: task._id, action: 'submit' })} disabled={actionMut.isPending}>
                          <Send className="h-3 w-3 mr-1" />Submit for Approval
                        </Button>
                      )}

                      {/* TL/Manager/Admin actions */}
                      {canAssign && task.status === 'submitted' && (
                        <>
                          <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => setActionDialog({ id: task._id, action: 'approve', title: task.title, seconds: task.productiveSeconds })}>
                            <ThumbsUp className="h-3 w-3 mr-1" />Approve
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 text-xs text-orange-600" onClick={() => setActionDialog({ id: task._id, action: 'return', title: task.title })}>
                            <RotateCcw className="h-3 w-3 mr-1" />Return
                          </Button>
                          <Button size="sm" variant="outline" className="h-8 text-xs text-destructive" onClick={() => setActionDialog({ id: task._id, action: 'reject', title: task.title })}>
                            <X className="h-3 w-3 mr-1" />Reject
                          </Button>
                        </>
                      )}

                      {canAssign && ['assigned'].includes(task.status) && (
                        <Button size="sm" variant="outline" className="h-8 text-xs text-destructive" onClick={() => { if (confirm('Delete?')) deleteMut.mutate(task._id); }}>
                          <Trash2 className="h-3 w-3 mr-1" />Delete
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Pagination page={page} totalPages={pagination.pages} total={pagination.total} onPageChange={setPage} />

      {/* Create Task Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Assign New Task</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="mt-1" /></div>
            <div><Label>Assign To *</Label><SimpleSelect value={form.assignedTo} onChange={v => setForm({ ...form, assignedTo: v })} options={[{ value: '', label: 'Select employee' }, ...employees.map(e => ({ value: e._id, label: `${e.name} (${e.department})` }))]} className="mt-1" /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Priority</Label><SimpleSelect value={form.priority} onChange={v => setForm({ ...form, priority: v })} options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }, { value: 'urgent', label: 'Urgent' }]} className="mt-1" /></div>
              <div><Label>Deadline</Label><Input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} className="mt-1" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createMut.mutate(form)} disabled={createMut.isPending || !form.title || !form.assignedTo}>
              {createMut.isPending ? 'Assigning...' : 'Assign Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Dialog (Approve/Return/Reject) */}
      <Dialog open={!!actionDialog} onOpenChange={() => setActionDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{actionDialog?.action === 'approve' ? 'Approve Task' : actionDialog?.action === 'return' ? 'Return for Improvement' : 'Reject Task'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">"{actionDialog?.title}"</p>
            {actionDialog?.action === 'approve' && (
              <div>
                <Label>Productive Time: {formatTime(actionDialog?.seconds || 0)}</Label>
                <div className="mt-1">
                  <Label className="text-xs text-muted-foreground">Adjust hours (+/-)</Label>
                  <Input type="number" step="0.5" value={adjustHours} onChange={e => setAdjustHours(e.target.value)} placeholder="e.g. +1 or -0.5" className="mt-1" />
                </div>
              </div>
            )}
            <div><Label>{actionDialog?.action === 'approve' ? 'Remarks' : 'Reason *'}</Label>
              <Textarea value={actionRemarks} onChange={e => setActionRemarks(e.target.value)} rows={2} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
            <Button onClick={() => actionMut.mutate({ id: actionDialog.id, action: actionDialog.action, remarks: actionRemarks, adjustHours })}
              disabled={actionMut.isPending || (actionDialog?.action !== 'approve' && !actionRemarks)}
              className={actionDialog?.action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : actionDialog?.action === 'return' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-destructive'}>
              {actionMut.isPending ? 'Processing...' : actionDialog?.action === 'approve' ? 'Approve' : actionDialog?.action === 'return' ? 'Return' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
