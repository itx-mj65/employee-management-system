'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, CheckCircle2, AlertCircle, ChevronDown, MessageSquare, Send, Edit3,
  ArrowUpRight, X, UserPlus, Clock, CalendarDays, AlertTriangle, Forward, ShieldCheck, GitBranch
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useDebounce } from '@/hooks/useDebounce';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import { PageSkeleton } from '@/components/shared/LoadingSkeleton';
import { TASK_STATUS_OPTIONS, PRIORITY_OPTIONS, ROLE_LABELS } from '@/constants';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { cn } from '@/lib/utils';

function SimpleSelect({ value, onChange, options, className, placeholder }) {
  return (<select value={value} onChange={e => onChange(e.target.value)} className={cn('flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring', className)}>
    {placeholder && <option value="">{placeholder}</option>}
    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>);
}

export default function TasksPage() {
  const { user, isAdmin, canApprove, role } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [commentText, setCommentText] = useState({});
  const [actionModal, setActionModal] = useState(null); // {task, action: 'approve'|'reject'|'forward'}
  const [actionRemarks, setActionRemarks] = useState('');
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', expectedCompletionTime: '', assignedTo: '', deadline: '' });
  const [checkInTasks, setCheckInTasks] = useState([{ title: '', description: '', priority: 'medium', expectedCompletionTime: '' }]);

  const { data: usersData } = useQuery({ queryKey: ['users-list'], queryFn: () => api.get('/users').then(r => r.data), enabled: isAdmin || role === 'manager' });
  const employees = usersData?.users?.filter(u => u.role !== 'admin') || [];
  const employeeOptions = useMemo(() => [{ value: '', label: 'Unassigned' }, ...employees.map(e => ({ value: e._id, label: `${e.name} — ${ROLE_LABELS[e.role] || 'Employee'}` }))], [employees]);
  const statusOptions = [{ value: '', label: 'All Status' }, ...TASK_STATUS_OPTIONS];
  const priorityOptions = PRIORITY_OPTIONS;

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', debouncedSearch, statusFilter],
    queryFn: () => api.get('/tasks', { params: { search: debouncedSearch || undefined, status: statusFilter || undefined } }).then(r => r.data),
  });

  const { data: dailyData, isFetched: df } = useQuery({ queryKey: ['daily-tasks-today'], queryFn: () => api.get('/daily-tasks').then(r => r.data), enabled: role === 'employee' });
  const { data: attData, isFetched: af } = useQuery({ queryKey: ['attendance-today'], queryFn: () => api.get('/attendance/today').then(r => r.data), enabled: role === 'employee' });

  useEffect(() => {
    if (role !== 'employee' || !df || !af) return;
    const checked = !!attData?.attendance?.checkIn;
    const hasTasks = !!dailyData?.dailyTaskList;
    const key = `ems-ci-${dayjs().format('YYYY-MM-DD')}`;
    if (checked && !hasTasks && !sessionStorage.getItem(key)) { setShowCheckIn(true); sessionStorage.setItem(key, '1'); }
  }, [role, dailyData, df, attData, af]);

  const dismiss = useCallback(() => { sessionStorage.setItem(`ems-ci-${dayjs().format('YYYY-MM-DD')}`, 'd'); setShowCheckIn(false); toast('Add tasks anytime with "New Task"', { icon: 'ℹ️' }); }, []);

  const createMut = useMutation({ mutationFn: p => api.post('/tasks', p), onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); qc.invalidateQueries({ queryKey: ['daily-tasks-today'] }); setShowCreate(false); setForm({ title: '', description: '', priority: 'medium', expectedCompletionTime: '', assignedTo: '', deadline: '' }); toast.success('Task created'); } });
  const updateMut = useMutation({ mutationFn: ({ id, ...d }) => api.put(`/tasks/${id}`, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); setEditTask(null); toast.success('Updated'); } });
  const actionMut = useMutation({ mutationFn: ({ id, action, remarks }) => api.put(`/tasks/${id}`, { action, remarks }), onSuccess: (_, { action }) => { qc.invalidateQueries({ queryKey: ['tasks'] }); setActionModal(null); setActionRemarks(''); toast.success(action === 'approve' ? 'Approved' : action === 'reject' ? 'Rejected' : action === 'forward' ? 'Forwarded to Manager' : 'Submitted'); } });
  const dailyMut = useMutation({ mutationFn: t => api.post('/daily-tasks', { tasks: t }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); qc.invalidateQueries({ queryKey: ['daily-tasks-today'] }); setShowCheckIn(false); sessionStorage.setItem(`ems-ci-${dayjs().format('YYYY-MM-DD')}`, 's'); toast.success('Tasks submitted!'); } });
  const commentMut = useMutation({ 
    mutationFn: ({ id, content }) => api.post(`/tasks/${id}/comments`, { content }), 
    onSuccess: (_, variables) => { 
      qc.invalidateQueries({ queryKey: ['task-comments', variables.id] }); 
      setCommentText(prev => ({ ...prev, [variables.id]: '' })); 
    } 
  });
  // Comments are fetched per-task inside the expanded card

  if (isLoading) return <PageSkeleton />;
  const tasks = data?.tasks || [];
  const progress = { 'todo': 0, 'in-progress': 20, 'pending-tl': 40, 'pending-manager': 60, 'pending-admin': 70, 'on-hold': 30, 'rejected': 0, 'approved': 100 };
  const borderColor = { approved: 'border-l-emerald-500', rejected: 'border-l-red-500', 'pending-tl': 'border-l-amber-400', 'pending-manager': 'border-l-orange-400', 'pending-admin': 'border-l-purple-400', 'in-progress': 'border-l-blue-500', 'on-hold': 'border-l-slate-400' };

  // Determine what actions current user can take on a task
  const getActions = (task) => {
    const a = [];
    const s = task.status;
    const isOwner = task.userId?._id === user?._id || task.assignedTo?._id === user?._id;
    
    // Employee/TL/anyone can submit their own tasks for approval
    if (['todo', 'in-progress', 'on-hold'].includes(s) && (isOwner || role !== 'employee')) {
      a.push('submit-approval');
    }
    // Also handle old 'pending-approval' status
    if (role === 'team-lead' && ['pending-tl', 'pending-approval'].includes(s)) { a.push('approve', 'reject', 'forward'); }
    if (role === 'manager' && ['pending-manager', 'pending-tl', 'pending-approval'].includes(s)) { a.push('approve', 'reject'); }
    if (role === 'admin' && ['pending-tl', 'pending-manager', 'pending-admin', 'pending-approval'].includes(s)) { a.push('approve', 'reject'); }
    return a;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-10" />
          </div>
          <SimpleSelect value={statusFilter} onChange={setStatusFilter} options={statusOptions} className="w-44 h-10" />
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1.5" /> New Task</Button>
      </div>

      {tasks.length === 0 ? (
        <EmptyState title="No tasks" description="Create your first task" action={<Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" /> Create</Button>} />
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const isExp = expandedId === task._id;
            const overdue = task.deadline && !['approved', 'rejected'].includes(task.status) && dayjs().isAfter(dayjs(task.deadline));
            const actions = getActions(task);
            return (
              <motion.div key={task._id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                <Card className={cn('overflow-hidden transition-all border border-l-4', borderColor[task.status] || 'border-l-slate-300', isExp && 'shadow-lg ring-1 ring-primary/10', overdue && 'bg-red-50/30 dark:bg-red-950/5')}>
                  <div className="p-4 cursor-pointer" onClick={() => setExpandedId(isExp ? null : task._id)}>
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <h3 className="font-semibold">{task.title}</h3>
                          <StatusBadge status={task.status} />
                          <StatusBadge status={task.priority} />
                          {overdue && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"><AlertTriangle className="h-3 w-3" />Overdue</span>}
                        </div>
                        {task.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{task.description}</p>}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{task.userId?.name}</span>
                          {task.assignedTo && <span className="flex items-center gap-1 text-primary font-medium"><UserPlus className="h-3 w-3" />{task.assignedTo.name}</span>}
                          <span>{dayjs(task.date).format('MMM D')}</span>
                          {task.deadline && <span className={cn(overdue && 'text-red-600 font-semibold')}>Due: {dayjs(task.deadline).format('MMM D')}</span>}
                        </div>
                        <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
                          <motion.div className={cn('h-full rounded-full', task.status === 'approved' ? 'bg-emerald-500' : task.status === 'rejected' ? 'bg-red-400' : 'bg-primary/70')} initial={{ width: 0 }} animate={{ width: `${progress[task.status] || 0}%` }} transition={{ duration: 0.6 }} />
                        </div>
                      </div>
                      <ChevronDown className={cn('h-5 w-5 text-muted-foreground transition-transform mt-1', isExp && 'rotate-180')} />
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExp && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                        <div className="border-t px-4 pb-4 space-y-4">
                          {/* Approval chain timeline */}
                          {task.approvalChain?.length > 0 && (
                            <div className="pt-4">
                              <p className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5"><GitBranch className="h-3.5 w-3.5" /> Approval History</p>
                              <div className="relative pl-6 space-y-3">
                                <div className="absolute left-[9px] top-1 bottom-1 w-0.5 bg-border" />
                                {task.approvalChain.map((step, i) => (
                                  <div key={i} className="relative flex items-start gap-3">
                                    <div className={cn('absolute left-[-15px] w-4 h-4 rounded-full border-2 bg-card z-10',
                                      step.action === 'approved' ? 'border-emerald-500' : step.action === 'rejected' ? 'border-red-500' : 'border-blue-500')} />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium">
                                        <span className="font-semibold">{step.userId?.name || 'Unknown'}</span>
                                        <span className={cn('ml-1.5', step.action === 'approved' ? 'text-emerald-600' : step.action === 'rejected' ? 'text-red-600' : 'text-blue-600')}>{step.action}</span>
                                        <span className="text-muted-foreground ml-1">as {ROLE_LABELS[step.role]}</span>
                                      </p>
                                      {step.remarks && <p className="text-xs text-muted-foreground mt-0.5 italic">&ldquo;{step.remarks}&rdquo;</p>}
                                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">{dayjs(step.timestamp).format('MMM D, h:mm A')}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {task.status === 'rejected' && task.rejectionRemarks && (
                            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                              <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">Rejection Reason</p>
                              <p className="text-sm text-red-600 dark:text-red-300">{task.rejectionRemarks}</p>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex flex-wrap gap-2 pt-2" onClick={e => e.stopPropagation()}>
                            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setEditTask({ ...task, assignedTo: task.assignedTo?._id || '', deadline: task.deadline ? dayjs(task.deadline).format('YYYY-MM-DD') : '' })}>
                              <Edit3 className="h-3 w-3 mr-1" /> Edit
                            </Button>
                            {actions.includes('submit-approval') && (
                              <Button size="sm" className="h-8 text-xs bg-amber-500 hover:bg-amber-600" onClick={() => actionMut.mutate({ id: task._id, action: 'submit-approval' })}>
                                <ArrowUpRight className="h-3 w-3 mr-1" /> Submit for Approval
                              </Button>
                            )}
                            {actions.includes('approve') && (
                              <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => setActionModal({ task, action: 'approve' })}>
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                              </Button>
                            )}
                            {actions.includes('forward') && (
                              <Button size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700" onClick={() => setActionModal({ task, action: 'forward' })}>
                                <Forward className="h-3 w-3 mr-1" /> Forward to Manager
                              </Button>
                            )}
                            {actions.includes('reject') && (
                              <Button variant="destructive" size="sm" className="h-8 text-xs" onClick={() => setActionModal({ task, action: 'reject' })}>
                                <AlertCircle className="h-3 w-3 mr-1" /> Reject
                              </Button>
                            )}
                          </div>

                          {/* Comments */}
                          <div className="pt-3 border-t">
                            <CommentsSection taskId={task._id} userId={user?._id} commentText={commentText[task._id] || ''} setCommentText={(val) => setCommentText(prev => ({ ...prev, [task._id]: val }))} commentMut={commentMut} />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent><DialogHeader><DialogTitle>Create Task</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Task title" className="mt-1" /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What needs to be done?" rows={3} className="mt-1" /></div>
            {(isAdmin || role === 'manager') && <div><Label>Assign To</Label><SimpleSelect value={form.assignedTo} onChange={v => setForm({ ...form, assignedTo: v })} options={employeeOptions} className="mt-1" /></div>}
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Priority</Label><SimpleSelect value={form.priority} onChange={v => setForm({ ...form, priority: v })} options={priorityOptions} className="mt-1" /></div>
              <div><Label>Deadline</Label><Input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} className="mt-1" /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button><Button onClick={() => { const p = { ...form }; if (!p.assignedTo) delete p.assignedTo; if (!p.deadline) delete p.deadline; createMut.mutate(p); }} disabled={createMut.isPending}>{createMut.isPending ? 'Creating...' : 'Create Task'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={!!editTask} onOpenChange={() => setEditTask(null)}>
        <DialogContent><DialogHeader><DialogTitle>Edit Task</DialogTitle></DialogHeader>
          {editTask && (<div className="space-y-4">
            <div><Label>Title</Label><Input value={editTask.title} onChange={e => setEditTask({ ...editTask, title: e.target.value })} className="mt-1" /></div>
            <div><Label>Description</Label><Textarea value={editTask.description} onChange={e => setEditTask({ ...editTask, description: e.target.value })} rows={3} className="mt-1" /></div>
            {(isAdmin || role === 'manager') && <div><Label>Assign To</Label><SimpleSelect value={editTask.assignedTo} onChange={v => setEditTask({ ...editTask, assignedTo: v })} options={employeeOptions} className="mt-1" /></div>}
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Priority</Label><SimpleSelect value={editTask.priority} onChange={v => setEditTask({ ...editTask, priority: v })} options={priorityOptions} className="mt-1" /></div>
              <div><Label>Deadline</Label><Input type="date" value={editTask.deadline} onChange={e => setEditTask({ ...editTask, deadline: e.target.value })} className="mt-1" /></div>
            </div>
          </div>)}
          <DialogFooter><Button variant="outline" onClick={() => setEditTask(null)}>Cancel</Button><Button onClick={() => updateMut.mutate({ id: editTask._id, title: editTask.title, description: editTask.description, priority: editTask.priority, assignedTo: editTask.assignedTo || null, deadline: editTask.deadline || null })} disabled={updateMut.isPending}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Action Modal */}
      <Dialog open={!!actionModal} onOpenChange={() => setActionModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{actionModal?.action === 'approve' ? 'Approve Task' : actionModal?.action === 'reject' ? 'Reject Task' : 'Forward to Manager'}</DialogTitle></DialogHeader>
          {actionModal && (<div className="space-y-3">
            <div className="p-3 rounded-lg bg-muted/50"><p className="font-medium text-sm">{actionModal.task.title}</p><p className="text-xs text-muted-foreground">{actionModal.task.userId?.name} · {dayjs(actionModal.task.date).format('MMM D')}</p></div>
            <div><Label>{actionModal.action === 'reject' ? 'Rejection Reason (required)' : 'Remarks (optional)'}</Label><Textarea value={actionRemarks} onChange={e => setActionRemarks(e.target.value)} placeholder={actionModal.action === 'reject' ? 'Why is this being rejected?' : 'Add a note...'} rows={3} className="mt-1" /></div>
          </div>)}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionModal(null)}>Cancel</Button>
            <Button className={actionModal?.action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : actionModal?.action === 'forward' ? 'bg-blue-600 hover:bg-blue-700' : ''} variant={actionModal?.action === 'reject' ? 'destructive' : 'default'}
              onClick={() => { if (actionModal.action === 'reject' && !actionRemarks.trim()) { toast.error('Rejection reason is required'); return; } actionMut.mutate({ id: actionModal.task._id, action: actionModal.action, remarks: actionRemarks }); }} disabled={actionMut.isPending}>
              {actionMut.isPending ? 'Processing...' : actionModal?.action === 'approve' ? 'Approve' : actionModal?.action === 'reject' ? 'Reject' : 'Forward'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Daily Check-in */}
      <Dialog open={showCheckIn} onOpenChange={o => { if (!o) dismiss(); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Plan Your Day</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            {checkInTasks.map((t, i) => (
              <div key={i} className="p-3 border rounded-lg space-y-2 relative">
                {checkInTasks.length > 1 && <button onClick={() => { if (checkInTasks.length > 1) setCheckInTasks(checkInTasks.filter((_, idx) => idx !== i)); }} className="absolute top-2 right-2 text-muted-foreground"><X className="h-3.5 w-3.5" /></button>}
                <Input value={t.title} onChange={e => { const u = [...checkInTasks]; u[i].title = e.target.value; setCheckInTasks(u); }} placeholder={`Task ${i + 1}`} className="h-9" />
                <Textarea value={t.description} onChange={e => { const u = [...checkInTasks]; u[i].description = e.target.value; setCheckInTasks(u); }} placeholder="Description" rows={2} className="text-sm" />
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setCheckInTasks([...checkInTasks, { title: '', description: '', priority: 'medium', expectedCompletionTime: '' }])} className="w-full"><Plus className="h-3.5 w-3.5 mr-1" />Add</Button>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="ghost" onClick={dismiss}>Skip</Button>
            <Button onClick={() => { const v = checkInTasks.filter(t => t.title.trim()); if (!v.length) { toast.error('Add a task'); return; } dailyMut.mutate(v); }} disabled={dailyMut.isPending} className="flex-1">{dailyMut.isPending ? 'Saving...' : 'Submit'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Separate component so each task has its own comments query
function CommentsSection({ taskId, userId, commentText, setCommentText, commentMut }) {
  const { data, isLoading } = useQuery({
    queryKey: ['task-comments', taskId],
    queryFn: () => api.get(`/tasks/${taskId}/comments`).then(r => r.data),
    enabled: !!taskId,
  });

  const comments = data?.comments || [];
  const inputRef = useRef(null);

  const handleSend = () => {
    if (!commentText?.trim()) return;
    commentMut.mutate({ id: taskId, content: commentText });
  };

  return (
    <>
      <p className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
        <MessageSquare className="h-3.5 w-3.5" /> Discussion ({comments.length})
      </p>

      <div className="space-y-2.5 max-h-72 overflow-y-auto mb-3 px-1">
        {isLoading && <p className="text-xs text-center text-muted-foreground py-4">Loading...</p>}
        {!isLoading && comments.length === 0 && (
          <p className="text-xs text-center text-muted-foreground py-6">No messages yet. Start the conversation.</p>
        )}
        {comments.map((c) => {
          const isMe = String(c.userId?._id) === String(userId);
          return (
            <div key={c._id} className={cn('flex', isMe ? 'justify-end' : 'justify-start')}>
              {!isMe && (
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mr-2 mt-1">
                  <span className="text-[10px] font-bold text-muted-foreground">{c.userId?.name?.charAt(0)}</span>
                </div>
              )}
              <div className={cn(
                'max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm',
                isMe
                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                  : 'bg-muted rounded-bl-sm'
              )}>
                {!isMe && (
                  <p className="text-[11px] font-semibold mb-0.5">{c.userId?.name}</p>
                )}
                <p className="text-[13px] leading-relaxed">{c.content}</p>
                <p className={cn(
                  'text-[10px] mt-1 text-right',
                  isMe ? 'text-primary-foreground/50' : 'text-muted-foreground/50'
                )}>
                  {dayjs(c.createdAt).format('h:mm A')}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2" onClick={e => e.stopPropagation()}>
        <Input
          ref={inputRef}
          value={commentText || ''}
          onChange={e => setCommentText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 h-10 rounded-full px-4 text-sm"
          onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
        />
        <Button
          size="icon"
          className="h-10 w-10 rounded-full"
          onClick={handleSend}
          disabled={commentMut.isPending || !commentText?.trim()}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </>
  );
}
