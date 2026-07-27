'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Plus, Search, CheckCircle2, AlertCircle, ChevronDown, MessageSquare, Send, Edit3,
  ArrowUpRight, X, UserPlus, Clock, CalendarDays, AlertTriangle, Forward, GitBranch, CalendarRange
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useEmployeeList, useDepartmentList } from '@/hooks/useSharedData';
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

const progress = { 'todo': 0, 'in-progress': 20, 'pending-tl': 40, 'pending-manager': 60, 'pending-admin': 70, 'on-hold': 30, 'rejected': 0, 'approved': 100 };
const borderColor = { approved: 'border-l-emerald-500', rejected: 'border-l-red-500', 'pending-tl': 'border-l-amber-400', 'pending-manager': 'border-l-orange-400', 'pending-admin': 'border-l-purple-400', 'in-progress': 'border-l-blue-500', 'on-hold': 'border-l-slate-400' };

export default function TasksPage() {
  const { user, isAdmin, canApprove, role } = useAuth();
  const qc = useQueryClient();

  const [tab, setTab] = useState('today');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [statusFilter, setStatusFilter] = useState('');
  const [empFilter, setEmpFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [weekOffset, setWeekOffset] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [commentText, setCommentText] = useState({});
  const [actionModal, setActionModal] = useState(null);
  const [actionRemarks, setActionRemarks] = useState('');
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', assignedTo: '', deadline: '' });
  const [checkInTasks, setCheckInTasks] = useState([{ title: '', description: '', priority: 'medium' }]);

  const showFilters = isAdmin || role === 'manager' || role === 'team-lead';
  const { employees } = useEmployeeList();
  const { departments } = useDepartmentList();

  const weekStart = dayjs().startOf('week').subtract(weekOffset, 'week');
  const weekEnd = weekStart.endOf('week');

  const queryParams = useMemo(() => {
    const p = {};
    if (debouncedSearch) p.search = debouncedSearch;
    if (statusFilter) p.status = statusFilter;
    if (empFilter !== 'all') p.employeeId = empFilter;
    if ((isAdmin || role === 'manager') && deptFilter !== 'all') p.department = deptFilter;
    if (tab === 'week') { p.from = weekStart.format('YYYY-MM-DD'); p.to = weekEnd.format('YYYY-MM-DD'); }
    return p;
  }, [debouncedSearch, statusFilter, empFilter, deptFilter, tab, weekOffset, isAdmin, role]);

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', tab, queryParams],
    queryFn: () => api.get('/tasks', { params: queryParams }).then(r => r.data),
  });

  const { data: dailyData, isFetched: df } = useQuery({ queryKey: ['daily-tasks-today'], queryFn: () => api.get('/daily-tasks').then(r => r.data), enabled: role === 'employee' });
  const { data: attData, isFetched: af } = useQuery({ queryKey: ['att-checkin'], queryFn: () => api.get('/attendance/today').then(r => r.data), enabled: role === 'employee' });

  useEffect(() => {
    if (role !== 'employee' || !df || !af) return;
    const key = `ems-ci-${dayjs().format('YYYY-MM-DD')}`;
    if (attData?.attendance?.checkIn && !dailyData?.dailyTaskList && !sessionStorage.getItem(key)) { setShowCheckIn(true); sessionStorage.setItem(key, '1'); }
  }, [role, dailyData, df, attData, af]);

  const createMut = useMutation({ mutationFn: p => api.post('/tasks', p), onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); qc.invalidateQueries({ queryKey: ['daily-tasks-today'] }); setShowCreate(false); setForm({ title: '', description: '', priority: 'medium', assignedTo: '', deadline: '' }); toast.success('Task created'); } });
  const updateMut = useMutation({ mutationFn: ({ id, ...d }) => api.put(`/tasks/${id}`, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); setEditTask(null); toast.success('Updated'); } });
  const actionMut = useMutation({ mutationFn: ({ id, action, remarks }) => api.put(`/tasks/${id}`, { action, remarks }), onSuccess: (_, { action }) => { qc.invalidateQueries({ queryKey: ['tasks'] }); setActionModal(null); setActionRemarks(''); toast.success(action === 'approve' ? 'Approved' : action === 'reject' ? 'Rejected' : action === 'forward' ? 'Forwarded' : 'Submitted'); } });
  const dailyMut = useMutation({ mutationFn: t => api.post('/daily-tasks', { tasks: t }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); qc.invalidateQueries({ queryKey: ['daily-tasks-today'] }); setShowCheckIn(false); toast.success('Tasks submitted!'); } });
  const commentMut = useMutation({ mutationFn: ({ id, content }) => api.post(`/tasks/${id}/comments`, { content }), onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: ['task-comments', v.id] }); setCommentText(prev => ({ ...prev, [v.id]: '' })); } });

  const getActions = useCallback((task) => {
    const a = [];
    const s = task.status;
    const isOwner = String(task.userId?._id) === String(user?._id) || String(task.assignedTo?._id) === String(user?._id);
    if (['todo', 'in-progress', 'on-hold', 'rejected'].includes(s) && (isOwner || role !== 'employee')) a.push('submit-approval');
    if (role === 'team-lead' && ['pending-tl', 'pending-approval'].includes(s)) a.push('approve', 'reject', 'forward');
    if (role === 'manager' && ['pending-manager', 'pending-tl', 'pending-approval'].includes(s)) a.push('approve', 'reject');
    if (role === 'admin' && ['pending-tl', 'pending-manager', 'pending-admin', 'pending-approval'].includes(s)) a.push('approve', 'reject');
    return a;
  }, [user?._id, role]);

  if (isLoading) return <PageSkeleton />;
  const tasks = data?.tasks || [];
  const statusOptions = [{ value: '', label: 'All Status' }, ...TASK_STATUS_OPTIONS];
  const empOptions = [{ value: 'all', label: 'All Employees' }, ...employees.map(e => ({ value: e._id, label: e.name }))];
  const deptOptions = [{ value: 'all', label: 'All Depts' }, ...departments.map(d => ({ value: d.name, label: d.name }))];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 flex-wrap">
        {['today', 'week'].map(t => (
          <button key={t} onClick={() => { setTab(t); setWeekOffset(0); }} className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all', tab === t ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>{t === 'today' ? 'Today' : 'Weekly'}</button>
        ))}
        {tab === 'week' && (
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" size="sm" className="h-8" onClick={() => setWeekOffset(w => w + 1)}>← Prev</Button>
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1"><CalendarRange className="h-3.5 w-3.5" />{weekStart.format('MMM D')} — {weekEnd.format('MMM D')}</span>
            <Button variant="outline" size="sm" className="h-8" onClick={() => setWeekOffset(w => Math.max(0, w - 1))} disabled={weekOffset === 0}>Next →</Button>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          <div className="relative flex-1 max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" /></div>
          <SimpleSelect value={statusFilter} onChange={setStatusFilter} options={statusOptions} className="w-36 h-9" />
          {showFilters && <SimpleSelect value={empFilter} onChange={setEmpFilter} options={empOptions} className="w-40 h-9" />}
          {(isAdmin || role === 'manager') && <SimpleSelect value={deptFilter} onChange={setDeptFilter} options={deptOptions} className="w-32 h-9" />}
        </div>
        <Button onClick={() => setShowCreate(true)} size="sm"><Plus className="h-4 w-4 mr-1" />New Task</Button>
      </div>

      {tasks.length === 0 ? (
        <EmptyState title={tab === 'week' ? 'No tasks this week' : 'No tasks today'} description="Create your first task" />
      ) : (
        <div className="space-y-2.5">
          {tasks.map((task) => (
            <TaskCard key={task._id} task={task} isExpanded={expandedId === task._id}
              onToggle={() => setExpandedId(expandedId === task._id ? null : task._id)}
              actions={getActions(task)} user={user} role={role}
              commentText={commentText[task._id] || ''}
              setCommentText={(val) => setCommentText(prev => ({ ...prev, [task._id]: val }))}
              commentMut={commentMut} actionMut={actionMut}
              onEdit={() => setEditTask({ ...task, assignedTo: task.assignedTo?._id || '', deadline: task.deadline ? dayjs(task.deadline).format('YYYY-MM-DD') : '' })}
              onAction={(action) => { setActionModal({ task, action }); setActionRemarks(''); }}
            />
          ))}
        </div>
      )}

      {/* Create */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent><DialogHeader><DialogTitle>Create Task</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Task title" className="mt-1" /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Details..." rows={3} className="mt-1" /></div>
            {showFilters && <div><Label>Assign To</Label><SimpleSelect value={form.assignedTo} onChange={v => setForm({ ...form, assignedTo: v })} options={[{ value: '', label: 'Unassigned' }, ...employees.map(e => ({ value: e._id, label: e.name }))]} className="mt-1" /></div>}
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Priority</Label><SimpleSelect value={form.priority} onChange={v => setForm({ ...form, priority: v })} options={PRIORITY_OPTIONS} className="mt-1" /></div>
              <div><Label>Deadline</Label><Input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} className="mt-1" /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button><Button onClick={() => { const p = { ...form }; if (!p.assignedTo) delete p.assignedTo; if (!p.deadline) delete p.deadline; createMut.mutate(p); }} disabled={createMut.isPending}>{createMut.isPending ? 'Creating...' : 'Create'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={!!editTask} onOpenChange={() => setEditTask(null)}>
        <DialogContent><DialogHeader><DialogTitle>Edit Task</DialogTitle></DialogHeader>
          {editTask && (<div className="space-y-4">
            <div><Label>Title</Label><Input value={editTask.title} onChange={e => setEditTask({ ...editTask, title: e.target.value })} className="mt-1" /></div>
            <div><Label>Description</Label><Textarea value={editTask.description} onChange={e => setEditTask({ ...editTask, description: e.target.value })} rows={3} className="mt-1" /></div>
            {showFilters && <div><Label>Assign To</Label><SimpleSelect value={editTask.assignedTo} onChange={v => setEditTask({ ...editTask, assignedTo: v })} options={[{ value: '', label: 'Unassigned' }, ...employees.map(e => ({ value: e._id, label: e.name }))]} className="mt-1" /></div>}
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Priority</Label><SimpleSelect value={editTask.priority} onChange={v => setEditTask({ ...editTask, priority: v })} options={PRIORITY_OPTIONS} className="mt-1" /></div>
              <div><Label>Deadline</Label><Input type="date" value={editTask.deadline} onChange={e => setEditTask({ ...editTask, deadline: e.target.value })} className="mt-1" /></div>
            </div>
          </div>)}
          <DialogFooter><Button variant="outline" onClick={() => setEditTask(null)}>Cancel</Button><Button onClick={() => updateMut.mutate({ id: editTask._id, title: editTask.title, description: editTask.description, priority: editTask.priority, assignedTo: editTask.assignedTo || null, deadline: editTask.deadline || null })} disabled={updateMut.isPending}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Modal */}
      <Dialog open={!!actionModal} onOpenChange={() => setActionModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{actionModal?.action === 'approve' ? 'Approve' : actionModal?.action === 'reject' ? 'Reject' : 'Forward'} Task</DialogTitle></DialogHeader>
          {actionModal && (<div className="space-y-3">
            <div className="p-3 rounded-lg bg-muted/50"><p className="font-medium text-sm">{actionModal.task.title}</p><p className="text-xs text-muted-foreground">{actionModal.task.userId?.name} · {dayjs(actionModal.task.date).format('MMM D')}</p></div>
            <div><Label>{actionModal.action === 'reject' ? 'Reason (required)' : 'Remarks'}</Label><Textarea value={actionRemarks} onChange={e => setActionRemarks(e.target.value)} placeholder={actionModal.action === 'reject' ? 'Why?' : 'Optional note...'} rows={3} className="mt-1" /></div>
          </div>)}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionModal(null)}>Cancel</Button>
            <Button className={actionModal?.action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : actionModal?.action === 'forward' ? 'bg-blue-600 hover:bg-blue-700' : ''} variant={actionModal?.action === 'reject' ? 'destructive' : 'default'}
              onClick={() => { if (actionModal.action === 'reject' && !actionRemarks.trim()) { toast.error('Reason required'); return; } actionMut.mutate({ id: actionModal.task._id, action: actionModal.action, remarks: actionRemarks }); }} disabled={actionMut.isPending}>
              {actionMut.isPending ? '...' : actionModal?.action === 'approve' ? 'Approve' : actionModal?.action === 'reject' ? 'Reject' : 'Forward'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Daily Check-in */}
      <Dialog open={showCheckIn} onOpenChange={o => { if (!o) { sessionStorage.setItem(`ems-ci-${dayjs().format('YYYY-MM-DD')}`, 'd'); setShowCheckIn(false); } }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Plan Your Day</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            {checkInTasks.map((t, i) => (
              <div key={i} className="p-3 border rounded-lg space-y-2 relative">
                {checkInTasks.length > 1 && <button onClick={() => setCheckInTasks(checkInTasks.filter((_, idx) => idx !== i))} className="absolute top-2 right-2 text-muted-foreground"><X className="h-3.5 w-3.5" /></button>}
                <Input value={t.title} onChange={e => { const u = [...checkInTasks]; u[i].title = e.target.value; setCheckInTasks(u); }} placeholder={`Task ${i + 1}`} className="h-9" />
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setCheckInTasks([...checkInTasks, { title: '', description: '', priority: 'medium' }])} className="w-full"><Plus className="h-3.5 w-3.5 mr-1" />Add</Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { sessionStorage.setItem(`ems-ci-${dayjs().format('YYYY-MM-DD')}`, 'd'); setShowCheckIn(false); }}>Skip</Button>
            <Button onClick={() => { const v = checkInTasks.filter(t => t.title.trim()); if (!v.length) { toast.error('Add a task'); return; } dailyMut.mutate(v); }} disabled={dailyMut.isPending} className="flex-1">{dailyMut.isPending ? 'Saving...' : 'Submit'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// === SEPARATE COMPONENT — prevents parent re-render from killing comments ===
function TaskCard({ task, isExpanded, onToggle, actions, user, role, commentText, setCommentText, commentMut, actionMut, onEdit, onAction }) {
  const overdue = task.deadline && !['approved', 'rejected'].includes(task.status) && dayjs().isAfter(dayjs(task.deadline));

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
      <Card className={cn('overflow-hidden border border-l-4', borderColor[task.status] || 'border-l-slate-300', isExpanded && 'shadow-lg ring-1 ring-primary/10', overdue && 'bg-red-50/30 dark:bg-red-950/5')}>
        <div className="p-4 cursor-pointer" onClick={onToggle}>
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <h3 className="font-semibold text-sm">{task.title}</h3>
                <StatusBadge status={task.status} />
                <StatusBadge status={task.priority} />
                {overdue && <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"><AlertTriangle className="h-3 w-3" />Overdue</span>}
              </div>
              {task.description && <p className="text-xs text-muted-foreground line-clamp-1 mb-1.5">{task.description}</p>}
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                <span>{task.userId?.name}{task.userId?.department ? ` · ${task.userId.department}` : ''}</span>
                {task.assignedTo && <span className="text-primary font-medium"><UserPlus className="h-3 w-3 inline mr-0.5" />{task.assignedTo.name}</span>}
                <span>{dayjs(task.date).format('MMM D')}</span>
                {task.deadline && <span className={cn(overdue && 'text-red-600 font-semibold')}>Due {dayjs(task.deadline).format('MMM D')}</span>}
              </div>
              <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className={cn('h-full rounded-full transition-all duration-700', task.status === 'approved' ? 'bg-emerald-500' : task.status === 'rejected' ? 'bg-red-400' : 'bg-primary/70')} style={{ width: `${progress[task.status] || 0}%` }} />
              </div>
            </div>
            <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform mt-1 shrink-0', isExpanded && 'rotate-180')} />
          </div>
        </div>

        {isExpanded && (
          <div className="border-t px-4 pb-4 space-y-4">
            {/* Approval chain */}
            {task.approvalChain?.length > 0 && (
              <div className="pt-4">
                <p className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5"><GitBranch className="h-3.5 w-3.5" />Approval History</p>
                <div className="relative pl-6 space-y-3">
                  <div className="absolute left-[9px] top-1 bottom-1 w-0.5 bg-border" />
                  {task.approvalChain.map((step, i) => (
                    <div key={i} className="relative flex items-start gap-3">
                      <div className={cn('absolute left-[-15px] w-4 h-4 rounded-full border-2 bg-card z-10', step.action === 'approved' ? 'border-emerald-500' : step.action === 'rejected' ? 'border-red-500' : 'border-blue-500')} />
                      <div className="flex-1">
                        <p className="text-xs font-medium">
                          <span className="font-semibold">{step.userId?.name || 'Unknown'}</span>
                          <span className={cn('ml-1.5', step.action === 'approved' ? 'text-emerald-600' : step.action === 'rejected' ? 'text-red-600' : 'text-blue-600')}>{step.action}</span>
                          <span className="text-muted-foreground ml-1">as {ROLE_LABELS[step.role] || step.role}</span>
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
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onEdit}><Edit3 className="h-3 w-3 mr-1" />Edit</Button>
              {actions.includes('submit-approval') && <Button size="sm" className="h-8 text-xs bg-amber-500 hover:bg-amber-600" onClick={() => actionMut.mutate({ id: task._id, action: 'submit-approval' })}><ArrowUpRight className="h-3 w-3 mr-1" />Submit for Approval</Button>}
              {actions.includes('approve') && <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => onAction('approve')}><CheckCircle2 className="h-3 w-3 mr-1" />Approve</Button>}
              {actions.includes('forward') && <Button size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700" onClick={() => onAction('forward')}><Forward className="h-3 w-3 mr-1" />Forward</Button>}
              {actions.includes('reject') && <Button variant="destructive" size="sm" className="h-8 text-xs" onClick={() => onAction('reject')}><AlertCircle className="h-3 w-3 mr-1" />Reject</Button>}
            </div>

            {/* Comments */}
            <div className="pt-3 border-t" onClick={e => e.stopPropagation()}>
              <CommentsSection taskId={task._id} userId={user?._id} commentText={commentText} setCommentText={setCommentText} commentMut={commentMut} />
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
}

// === COMMENTS — isolated component with its own data lifecycle ===
function CommentsSection({ taskId, userId, commentText, setCommentText, commentMut }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['task-comments', taskId],
    queryFn: () => api.get(`/tasks/${taskId}/comments`).then(r => r.data),
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: 1000,
  });
  
  const comments = data?.comments || [];
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current && comments.length > 0) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments.length]);

  const handleSend = () => {
    if (!commentText?.trim()) return;
    commentMut.mutate({ id: taskId, content: commentText });
  };

  return (
    <>
      <p className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
        <MessageSquare className="h-3.5 w-3.5" />Discussion {!isLoading && `(${comments.length})`}
      </p>

      <div ref={scrollRef} className="space-y-2.5 max-h-72 overflow-y-auto mb-3 px-1">
        {isLoading && (
          <div className="flex items-center justify-center py-6 gap-2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-muted-foreground">Loading...</span>
          </div>
        )}
        {isError && (
          <div className="text-center py-4">
            <p className="text-xs text-muted-foreground mb-2">Failed to load</p>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => refetch()}>Retry</Button>
          </div>
        )}
        {!isLoading && !isError && comments.length === 0 && (
          <p className="text-xs text-center text-muted-foreground py-6">No messages yet.</p>
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
              <div className={cn('max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm', isMe ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted rounded-bl-sm')}>
                {!isMe && <p className="text-[11px] font-semibold mb-0.5">{c.userId?.name}</p>}
                <p className="text-[13px] leading-relaxed">{c.content}</p>
                <p className={cn('text-[10px] mt-1 text-right', isMe ? 'text-primary-foreground/50' : 'text-muted-foreground/50')}>{dayjs(c.createdAt).format('h:mm A')}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        <Input value={commentText || ''} onChange={e => setCommentText(e.target.value)} placeholder="Type a message..." className="flex-1 h-10 rounded-full px-4 text-sm" onKeyDown={e => { if (e.key === 'Enter') handleSend(); }} />
        <Button size="icon" className="h-10 w-10 rounded-full" onClick={handleSend} disabled={commentMut.isPending || !commentText?.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </>
  );
}
