'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, CheckCircle2, AlertCircle, ChevronDown,
  MessageSquare, Send, Edit3, ArrowUpRight, X, UserPlus, Clock, CalendarDays, AlertTriangle
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
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
import { TASK_STATUS_OPTIONS, PRIORITY_OPTIONS } from '@/constants';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { cn } from '@/lib/utils';

// Custom Select to show labels not values
function SimpleSelect({ value, onChange, options, placeholder, className }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

export default function TasksPage() {
  const { isAdmin, user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [comment, setComment] = useState('');
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', expectedCompletionTime: '', assignedTo: '', deadline: '' });
  const [checkInTasks, setCheckInTasks] = useState([{ title: '', description: '', priority: 'medium', expectedCompletionTime: '' }]);

  const { data: usersData } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => api.get('/users').then(r => r.data),
    enabled: isAdmin,
  });
  const employees = usersData?.users?.filter(u => u.role === 'employee') || [];
  const employeeOptions = useMemo(() => [
    { value: '', label: 'Unassigned' },
    ...employees.map(e => ({ value: e._id, label: `${e.name} — ${e.department || e.position || 'Employee'}` }))
  ], [employees]);

  const statusOptions = [{ value: '', label: 'All Status' }, ...TASK_STATUS_OPTIONS.map(s => ({ value: s.value, label: s.label }))];
  const priorityOptions = PRIORITY_OPTIONS.map(p => ({ value: p.value, label: p.label }));
  const taskStatusOpts = TASK_STATUS_OPTIONS.map(s => ({ value: s.value, label: s.label }));

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', search, statusFilter],
    queryFn: () => api.get('/tasks', { params: { search, status: statusFilter || undefined } }).then(r => r.data),
  });

  const { data: dailyData, isFetched: dailyFetched } = useQuery({
    queryKey: ['daily-tasks-today'],
    queryFn: () => api.get('/daily-tasks').then(r => r.data),
    enabled: !isAdmin,
  });

  const { data: attendanceData, isFetched: attendanceFetched } = useQuery({
    queryKey: ['attendance-today'],
    queryFn: () => api.get('/attendance/today').then(r => r.data),
    enabled: !isAdmin,
  });

  useEffect(() => {
    if (isAdmin || !dailyFetched || !attendanceFetched) return;
    const isCheckedIn = !!attendanceData?.attendance?.checkIn;
    const hasDailyTasks = !!dailyData?.dailyTaskList;
    const todayKey = `ems-checkin-popup-${dayjs().format('YYYY-MM-DD')}`;
    const alreadyShown = sessionStorage.getItem(todayKey);
    if (isCheckedIn && !hasDailyTasks && !alreadyShown) {
      setShowCheckIn(true);
      sessionStorage.setItem(todayKey, 'shown');
    }
  }, [isAdmin, dailyData, dailyFetched, attendanceData, attendanceFetched]);

  const dismissCheckIn = useCallback(() => {
    sessionStorage.setItem(`ems-checkin-popup-${dayjs().format('YYYY-MM-DD')}`, 'dismissed');
    setShowCheckIn(false);
    toast('You can add tasks later with the "New Task" button', { icon: 'ℹ️' });
  }, []);

  const createMutation = useMutation({
    mutationFn: (p) => api.post('/tasks', p),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tasks'] }); queryClient.invalidateQueries({ queryKey: ['daily-tasks-today'] }); setShowCreate(false); setForm({ title: '', description: '', priority: 'medium', expectedCompletionTime: '', assignedTo: '', deadline: '' }); toast.success('Task created'); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...d }) => api.put(`/tasks/${id}`, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tasks'] }); setEditTask(null); toast.success('Task updated'); },
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action }) => api.put(`/tasks/${id}`, { action }),
    onSuccess: (_, { action }) => { queryClient.invalidateQueries({ queryKey: ['tasks'] }); toast.success(action === 'approve' ? 'Task approved' : action === 'reject' ? 'Task rejected' : 'Approval requested'); },
  });

  const dailyMutation = useMutation({
    mutationFn: (tasks) => api.post('/daily-tasks', { tasks }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tasks'] }); queryClient.invalidateQueries({ queryKey: ['daily-tasks-today'] }); setShowCheckIn(false); sessionStorage.setItem(`ems-checkin-popup-${dayjs().format('YYYY-MM-DD')}`, 'submitted'); toast.success('Daily tasks submitted!'); },
  });

  const commentMutation = useMutation({
    mutationFn: ({ id, content }) => api.post(`/tasks/${id}/comments`, { content }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['task-comments', expandedId] }); setComment(''); toast.success('Comment added'); },
  });

  const { data: commentsData } = useQuery({
    queryKey: ['task-comments', expandedId],
    queryFn: () => api.get(`/tasks/${expandedId}/comments`).then(r => r.data),
    enabled: !!expandedId,
  });

  const addCheckInTask = () => setCheckInTasks([...checkInTasks, { title: '', description: '', priority: 'medium', expectedCompletionTime: '' }]);
  const updateCheckInTask = (i, f, v) => { const u = [...checkInTasks]; u[i][f] = v; setCheckInTasks(u); };
  const removeCheckInTask = (i) => { if (checkInTasks.length > 1) setCheckInTasks(checkInTasks.filter((_, idx) => idx !== i)); };

  if (isLoading) return <PageSkeleton />;
  const tasks = data?.tasks || [];
  const statusProgress = { 'todo': 0, 'in-progress': 25, 'pending-approval': 60, 'on-hold': 40, 'rejected': 0, 'approved': 100 };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <SimpleSelect value={statusFilter} onChange={setStatusFilter} options={statusOptions} className="w-44" />
        </div>
        <Button onClick={() => setShowCreate(true)} size="sm"><Plus className="h-4 w-4 mr-1" /> New Task</Button>
      </div>

      {tasks.length === 0 ? (
        <EmptyState title="No tasks found" description="Create your first task to get started"
          action={<Button onClick={() => setShowCreate(true)} size="sm"><Plus className="h-4 w-4 mr-1" /> Create Task</Button>} />
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {tasks.map((task) => {
              const isExpanded = expandedId === task._id;
              const progress = statusProgress[task.status] || 0;
              const isOverdue = task.deadline && !['approved', 'rejected'].includes(task.status) && dayjs().isAfter(dayjs(task.deadline));
              return (
                <motion.div key={task._id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <Card className={cn(
                    'overflow-hidden transition-all cursor-pointer border',
                    isExpanded ? 'shadow-md border-primary/30 ring-1 ring-primary/10' : 'hover:shadow-sm',
                    task.status === 'approved' && 'border-l-4 border-l-emerald-500',
                    task.status === 'rejected' && 'border-l-4 border-l-red-500',
                    task.status === 'pending-approval' && 'border-l-4 border-l-amber-500',
                    task.status === 'in-progress' && 'border-l-4 border-l-blue-500',
                    isOverdue && 'border-l-4 border-l-red-600 bg-red-50/30 dark:bg-red-950/10',
                  )}>
                    <CardContent className="p-0">
                      <div className="p-4 flex items-center gap-3" onClick={() => setExpandedId(isExpanded ? null : task._id)}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            <h3 className="font-semibold text-sm">{task.title}</h3>
                            <StatusBadge status={task.status} />
                            <StatusBadge status={task.priority} />
                            {isOverdue && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                                <AlertTriangle className="h-3 w-3" /> Overdue
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                            {task.userId && <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{task.userId.name}</span>}
                            {task.assignedTo && <span className="flex items-center gap-1 text-primary font-medium"><UserPlus className="h-3 w-3" />{task.assignedTo.name}</span>}
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{dayjs(task.date).format('MMM D')}</span>
                            {task.deadline && <span className={cn('flex items-center gap-1', isOverdue && 'text-red-600 font-medium')}>Due: {dayjs(task.deadline).format('MMM D')}</span>}
                          </div>
                          <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                            <motion.div className={cn('h-full rounded-full', task.status === 'approved' ? 'bg-emerald-500' : task.status === 'rejected' ? 'bg-red-400' : 'bg-primary')} initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.5 }} />
                          </div>
                        </div>
                        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform shrink-0', isExpanded && 'rotate-180')} />
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                            <div className="px-4 pb-4 border-t border-border/50">
                              {task.description && <div className="pt-3 pb-3"><p className="text-xs font-medium text-muted-foreground mb-1">Description</p><p className="text-sm">{task.description}</p></div>}
                              <div className="flex flex-wrap gap-2 py-3 border-t border-border/50">
                                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={(e) => { e.stopPropagation(); setEditTask({ ...task, assignedTo: task.assignedTo?._id || '', deadline: task.deadline ? dayjs(task.deadline).format('YYYY-MM-DD') : '' }); }}>
                                  <Edit3 className="h-3 w-3 mr-1" /> Edit
                                </Button>
                                {!isAdmin && !['pending-approval', 'approved'].includes(task.status) && (
                                  <Button variant="outline" size="sm" className="h-8 text-xs border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400"
                                    onClick={(e) => { e.stopPropagation(); actionMutation.mutate({ id: task._id, action: 'request-approval' }); }}><ArrowUpRight className="h-3 w-3 mr-1" /> Request Approval</Button>
                                )}
                                {isAdmin && task.status === 'pending-approval' && (
                                  <>
                                    <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={(e) => { e.stopPropagation(); actionMutation.mutate({ id: task._id, action: 'approve' }); }}><CheckCircle2 className="h-3 w-3 mr-1" /> Approve</Button>
                                    <Button variant="destructive" size="sm" className="h-8 text-xs" onClick={(e) => { e.stopPropagation(); actionMutation.mutate({ id: task._id, action: 'reject' }); }}><AlertCircle className="h-3 w-3 mr-1" /> Reject</Button>
                                  </>
                                )}
                              </div>
                              <div className="pt-3 border-t border-border/50">
                                <p className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1"><MessageSquare className="h-3 w-3" /> Comments ({commentsData?.comments?.length || 0})</p>
                                <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                                  {commentsData?.comments?.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">No comments yet</p>}
                                  {commentsData?.comments?.map((c) => (
                                    <div key={c._id} className="flex gap-2.5">
                                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5"><span className="text-[10px] font-medium text-primary">{c.userId?.name?.charAt(0)}</span></div>
                                      <div className="flex-1 bg-muted/60 rounded-lg px-3 py-2">
                                        <div className="flex items-center justify-between mb-0.5"><span className="text-xs font-semibold">{c.userId?.name}</span><span className="text-[10px] text-muted-foreground">{dayjs(c.createdAt).format('MMM D, h:mm A')}</span></div>
                                        <p className="text-xs leading-relaxed">{c.content}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                                  <Input value={comment} onChange={e => setComment(e.target.value)} placeholder="Add a comment..." className="flex-1 h-9 text-sm" onKeyDown={e => { if (e.key === 'Enter' && comment.trim()) commentMutation.mutate({ id: task._id, content: comment }); }} />
                                  <Button size="sm" className="h-9 px-3" onClick={() => comment.trim() && commentMutation.mutate({ id: task._id, content: comment })} disabled={commentMutation.isPending}><Send className="h-3.5 w-3.5" /></Button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Create Task */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Task</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Task title" /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional description" rows={3} /></div>
            {isAdmin && <div><Label>Assign To</Label><SimpleSelect value={form.assignedTo} onChange={v => setForm({ ...form, assignedTo: v })} options={employeeOptions} placeholder="Select employee" /></div>}
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Priority</Label><SimpleSelect value={form.priority} onChange={v => setForm({ ...form, priority: v })} options={priorityOptions} /></div>
              <div><Label>Deadline</Label><Input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} /></div>
            </div>
            <div><Label>Expected Time</Label><Input value={form.expectedCompletionTime} onChange={e => setForm({ ...form, expectedCompletionTime: e.target.value })} placeholder="e.g. 2 hours" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => { const p = { ...form }; if (!p.assignedTo) delete p.assignedTo; if (!p.deadline) delete p.deadline; createMutation.mutate(p); }} disabled={createMutation.isPending}>{createMutation.isPending ? 'Creating...' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Task */}
      <Dialog open={!!editTask} onOpenChange={() => setEditTask(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Task</DialogTitle></DialogHeader>
          {editTask && (
            <div className="space-y-4">
              <div><Label>Title</Label><Input value={editTask.title} onChange={e => setEditTask({ ...editTask, title: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea value={editTask.description} onChange={e => setEditTask({ ...editTask, description: e.target.value })} rows={3} /></div>
              {isAdmin && <div><Label>Assign To</Label><SimpleSelect value={editTask.assignedTo} onChange={v => setEditTask({ ...editTask, assignedTo: v })} options={employeeOptions} /></div>}
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Priority</Label><SimpleSelect value={editTask.priority} onChange={v => setEditTask({ ...editTask, priority: v })} options={priorityOptions} /></div>
                <div><Label>Status</Label><SimpleSelect value={editTask.status} onChange={v => setEditTask({ ...editTask, status: v })} options={taskStatusOpts} /></div>
              </div>
              <div><Label>Deadline</Label><Input type="date" value={editTask.deadline} onChange={e => setEditTask({ ...editTask, deadline: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTask(null)}>Cancel</Button>
            <Button onClick={() => updateMutation.mutate({ id: editTask._id, title: editTask.title, description: editTask.description, priority: editTask.priority, status: editTask.status, assignedTo: editTask.assignedTo || null, deadline: editTask.deadline || null })} disabled={updateMutation.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Daily Check-in */}
      <Dialog open={showCheckIn} onOpenChange={(o) => { if (!o) dismissCheckIn(); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Good Morning! Plan Your Day</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Add the tasks you plan to work on today.</p>
          <div className="space-y-4 mt-2">
            {checkInTasks.map((t, i) => (
              <div key={i} className="p-3 border rounded-lg space-y-3 relative">
                {checkInTasks.length > 1 && <button onClick={() => removeCheckInTask(i)} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>}
                <div><Label className="text-xs">Task {i + 1}</Label><Input value={t.title} onChange={e => updateCheckInTask(i, 'title', e.target.value)} placeholder="Task title" className="h-9" /></div>
                <Textarea value={t.description} onChange={e => updateCheckInTask(i, 'description', e.target.value)} placeholder="Description" rows={2} className="text-sm" />
                <div className="grid grid-cols-2 gap-2">
                  <SimpleSelect value={t.priority} onChange={v => updateCheckInTask(i, 'priority', v)} options={priorityOptions} className="h-9 text-xs" />
                  <Input value={t.expectedCompletionTime} onChange={e => updateCheckInTask(i, 'expectedCompletionTime', e.target.value)} placeholder="ETA" className="h-9 text-sm" />
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addCheckInTask} className="w-full"><Plus className="h-3.5 w-3.5 mr-1" /> Add Task</Button>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="ghost" onClick={dismissCheckIn} className="text-muted-foreground">Skip</Button>
            <Button onClick={() => { const v = checkInTasks.filter(t => t.title.trim()); if (!v.length) { toast.error('Add at least one task'); return; } dailyMutation.mutate(v); }} disabled={dailyMutation.isPending} className="flex-1">{dailyMutation.isPending ? 'Submitting...' : 'Submit Tasks'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
