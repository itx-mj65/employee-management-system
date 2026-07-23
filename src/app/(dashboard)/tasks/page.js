'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, CheckCircle2, AlertCircle,
  MoreHorizontal, MessageSquare, Send, Trash2, Edit3, ArrowUpRight, X, UserPlus
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { PageSkeleton } from '@/components/shared/LoadingSkeleton';
import { TASK_STATUS_OPTIONS, PRIORITY_OPTIONS } from '@/constants';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

export default function TasksPage() {
  const { isAdmin, user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [commentTask, setCommentTask] = useState(null);
  const [comment, setComment] = useState('');

  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', expectedCompletionTime: '', assignedTo: '' });
  const [checkInTasks, setCheckInTasks] = useState([{ title: '', description: '', priority: 'medium', expectedCompletionTime: '' }]);

  // Fetch employees list for assignment (admin)
  const { data: usersData } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => api.get('/users').then(r => r.data),
    enabled: isAdmin,
  });

  const employees = usersData?.users?.filter(u => u.role === 'employee') || [];

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', search, statusFilter],
    queryFn: () => api.get('/tasks', { params: { search, status: statusFilter } }).then(r => r.data),
  });

  // Check if employee needs daily check-in
  const { data: dailyData } = useQuery({
    queryKey: ['daily-tasks-today'],
    queryFn: () => api.get('/daily-tasks').then(r => r.data),
    enabled: !isAdmin,
  });

  const { data: attendanceData } = useQuery({
    queryKey: ['attendance-today'],
    queryFn: () => api.get('/attendance/today').then(r => r.data),
    enabled: !isAdmin,
  });

  useEffect(() => {
    if (!isAdmin && attendanceData?.attendance?.checkIn && !dailyData?.dailyTaskList) {
      setShowCheckIn(true);
    }
  }, [isAdmin, dailyData, attendanceData]);

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/tasks', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['daily-tasks-today'] });
      setShowCreate(false);
      setForm({ title: '', description: '', priority: 'medium', expectedCompletionTime: '', assignedTo: '' });
      toast.success('Task created');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }) => api.put(`/tasks/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setEditTask(null);
      toast.success('Task updated');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setDeleteId(null);
      toast.success('Task deleted');
    },
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action }) => api.put(`/tasks/${id}`, { action }),
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success(action === 'approve' ? 'Task approved' : action === 'reject' ? 'Task rejected' : 'Approval requested');
    },
  });

  const dailyMutation = useMutation({
    mutationFn: (tasks) => api.post('/daily-tasks', { tasks }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['daily-tasks-today'] });
      setShowCheckIn(false);
      toast.success('Daily tasks submitted');
    },
  });

  const commentMutation = useMutation({
    mutationFn: ({ id, content }) => api.post(`/tasks/${id}/comments`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', commentTask?._id] });
      setComment('');
      toast.success('Comment added');
    },
  });

  const { data: commentsData } = useQuery({
    queryKey: ['task-comments', commentTask?._id],
    queryFn: () => api.get(`/tasks/${commentTask._id}/comments`).then(r => r.data),
    enabled: !!commentTask,
  });

  const addCheckInTask = () => {
    setCheckInTasks([...checkInTasks, { title: '', description: '', priority: 'medium', expectedCompletionTime: '' }]);
  };

  const updateCheckInTask = (index, field, value) => {
    const updated = [...checkInTasks];
    updated[index][field] = value;
    setCheckInTasks(updated);
  };

  const removeCheckInTask = (index) => {
    if (checkInTasks.length > 1) setCheckInTasks(checkInTasks.filter((_, i) => i !== index));
  };

  const submitCheckIn = () => {
    const validTasks = checkInTasks.filter(t => t.title.trim());
    if (validTasks.length === 0) { toast.error('Add at least one task'); return; }
    dailyMutation.mutate(validTasks);
  };

  if (isLoading) return <PageSkeleton />;

  const tasks = data?.tasks || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {TASK_STATUS_OPTIONS.map(s => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setShowCreate(true)} size="sm"><Plus className="h-4 w-4 mr-1" /> New Task</Button>
      </div>

      {/* Task cards */}
      {tasks.length === 0 ? (
        <EmptyState title="No tasks found" description="Create your first task to get started"
          action={<Button onClick={() => setShowCreate(true)} size="sm"><Plus className="h-4 w-4 mr-1" /> Create Task</Button>} />
      ) : (
        <div className="grid gap-3">
          <AnimatePresence>
            {tasks.map((task) => (
              <motion.div key={task._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <Card className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-medium text-sm">{task.title}</h3>
                          <StatusBadge status={task.status} />
                          <StatusBadge status={task.priority} />
                        </div>
                        {task.description && <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{task.description}</p>}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          {task.userId && <span>By: {task.userId.name}</span>}
                          {task.assignedTo && (
                            <span className="text-primary font-medium flex items-center gap-1">
                              <UserPlus className="h-3 w-3" /> {task.assignedTo.name}
                            </span>
                          )}
                          <span>{dayjs(task.date).format('MMM D')}</span>
                          {task.expectedCompletionTime && <span>ETA: {task.expectedCompletionTime}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCommentTask(task)}>
                          <MessageSquare className="h-3.5 w-3.5" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditTask({ ...task, assignedTo: task.assignedTo?._id || '' })}>
                              <Edit3 className="h-3.5 w-3.5 mr-2" /> Edit
                            </DropdownMenuItem>
                            {!isAdmin && !['pending-approval', 'approved'].includes(task.status) && (
                              <DropdownMenuItem onClick={() => actionMutation.mutate({ id: task._id, action: 'request-approval' })}>
                                <ArrowUpRight className="h-3.5 w-3.5 mr-2" /> Request Approval
                              </DropdownMenuItem>
                            )}
                            {isAdmin && task.status === 'pending-approval' && (
                              <>
                                <DropdownMenuItem onClick={() => actionMutation.mutate({ id: task._id, action: 'approve' })}>
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => actionMutation.mutate({ id: task._id, action: 'reject' })}>
                                  <AlertCircle className="h-3.5 w-3.5 mr-2" /> Reject
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuItem onClick={() => setDeleteId(task._id)} className="text-destructive">
                              <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create Task Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Task</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Task title" /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional description" rows={3} /></div>
            {isAdmin && (
              <div>
                <Label>Assign To Employee</Label>
                <Select value={form.assignedTo} onValueChange={v => setForm({ ...form, assignedTo: v })}>
                  <SelectTrigger><SelectValue placeholder="Select employee (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {employees.map(e => <SelectItem key={e._id} value={e._id}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITY_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Expected Time</Label><Input value={form.expectedCompletionTime} onChange={e => setForm({ ...form, expectedCompletionTime: e.target.value })} placeholder="e.g. 2 hours" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => {
              const payload = { ...form };
              if (payload.assignedTo === 'none' || !payload.assignedTo) delete payload.assignedTo;
              createMutation.mutate(payload);
            }} disabled={createMutation.isPending}>{createMutation.isPending ? 'Creating...' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={!!editTask} onOpenChange={() => setEditTask(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Task</DialogTitle></DialogHeader>
          {editTask && (
            <div className="space-y-4">
              <div><Label>Title</Label><Input value={editTask.title} onChange={e => setEditTask({ ...editTask, title: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea value={editTask.description} onChange={e => setEditTask({ ...editTask, description: e.target.value })} rows={3} /></div>
              {isAdmin && (
                <div>
                  <Label>Assign To</Label>
                  <Select value={editTask.assignedTo || 'none'} onValueChange={v => setEditTask({ ...editTask, assignedTo: v === 'none' ? '' : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {employees.map(e => <SelectItem key={e._id} value={e._id}>{e.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Priority</Label>
                  <Select value={editTask.priority} onValueChange={v => setEditTask({ ...editTask, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PRIORITY_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={editTask.status} onValueChange={v => setEditTask({ ...editTask, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TASK_STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTask(null)}>Cancel</Button>
            <Button onClick={() => {
              const payload = {
                id: editTask._id, title: editTask.title, description: editTask.description,
                priority: editTask.priority, status: editTask.status,
                assignedTo: editTask.assignedTo || null,
              };
              updateMutation.mutate(payload);
            }} disabled={updateMutation.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Daily Check-in Popup */}
      <Dialog open={showCheckIn} onOpenChange={() => {}}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" onPointerDownOutside={e => e.preventDefault()}>
          <DialogHeader><DialogTitle>Good Morning! Enter Today&apos;s Tasks</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Plan your day by adding the tasks you&apos;ll work on.</p>
          <div className="space-y-4 mt-2">
            {checkInTasks.map((t, i) => (
              <div key={i} className="p-3 border rounded-lg space-y-3 relative">
                {checkInTasks.length > 1 && (
                  <button onClick={() => removeCheckInTask(i)} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
                )}
                <div><Label className="text-xs">Task {i + 1}</Label><Input value={t.title} onChange={e => updateCheckInTask(i, 'title', e.target.value)} placeholder="Task title" className="h-9" /></div>
                <Textarea value={t.description} onChange={e => updateCheckInTask(i, 'description', e.target.value)} placeholder="Description (optional)" rows={2} className="text-sm" />
                <div className="grid grid-cols-2 gap-2">
                  <Select value={t.priority} onValueChange={v => updateCheckInTask(i, 'priority', v)}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{PRIORITY_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input value={t.expectedCompletionTime} onChange={e => updateCheckInTask(i, 'expectedCompletionTime', e.target.value)} placeholder="ETA" className="h-9 text-sm" />
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addCheckInTask} className="w-full"><Plus className="h-3.5 w-3.5 mr-1" /> Add Another Task</Button>
          </div>
          <DialogFooter>
            <Button onClick={submitCheckIn} disabled={dailyMutation.isPending} className="w-full">{dailyMutation.isPending ? 'Submitting...' : 'Submit Tasks'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comments Dialog */}
      <Dialog open={!!commentTask} onOpenChange={() => setCommentTask(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="text-sm">Comments — {commentTask?.title}</DialogTitle></DialogHeader>
          <div className="max-h-64 overflow-y-auto space-y-3">
            {commentsData?.comments?.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No comments yet</p>}
            {commentsData?.comments?.map((c) => (
              <div key={c._id} className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">{c.userId?.name}</span>
                  <span className="text-[10px] text-muted-foreground">{dayjs(c.createdAt).format('MMM D, h:mm A')}</span>
                </div>
                <p className="text-sm">{c.content}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={comment} onChange={e => setComment(e.target.value)} placeholder="Write a comment..." className="flex-1" onKeyDown={e => {
              if (e.key === 'Enter' && comment.trim()) commentMutation.mutate({ id: commentTask._id, content: comment });
            }} />
            <Button size="icon" onClick={() => comment.trim() && commentMutation.mutate({ id: commentTask._id, content: comment })} disabled={commentMutation.isPending}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Delete Task" description="This will permanently delete this task." onConfirm={() => deleteMutation.mutate(deleteId)} loading={deleteMutation.isPending} destructive />
    </div>
  );
}
