'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, ChevronDown, ChevronRight, Send, Edit3, Trash2, Play,
  RotateCcw, ThumbsUp, X, Timer, Flag, Calendar, User as UserIcon,
  MessageSquare, Bold, Italic, Underline, Link, List, AlignLeft,
  Image as ImageIcon, Paperclip, Video, CheckSquare, MoreHorizontal
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useEmployeeList } from '@/hooks/useSharedData';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import SimpleSelect from '@/components/shared/SimpleSelect';
import RichTextEditor from '@/components/shared/RichTextEditor';
import EmptyState from '@/components/shared/EmptyState';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  assigned:  { label: 'TO DO',       color: 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200' },
  accepted:  { label: 'IN PROGRESS', color: 'bg-blue-500 text-white' },
  submitted: { label: 'IN REVIEW',   color: 'bg-amber-500 text-white' },
  returned:  { label: 'RETURNED',    color: 'bg-orange-500 text-white' },
  approved:  { label: 'APPROVED',    color: 'bg-emerald-500 text-white' },
  rejected:  { label: 'REJECTED',    color: 'bg-red-500 text-white' },
};

const PRIORITY_CONFIG = {
  urgent: { icon: '🚩', color: 'text-red-500' },
  high:   { icon: '⚠️', color: 'text-orange-500' },
  medium: { icon: '🔵', color: 'text-blue-400' },
  low:    { icon: '⬇️', color: 'text-slate-400' },
};

function formatTime(s) {
  if (!s) return '0h 0m';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
}

export default function TasksPage() {
  const { user, role, isAdmin } = useAuth();
  const qc = useQueryClient();
  const canAssign = isAdmin || role === 'manager' || role === 'team-lead';

  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedTask, setExpandedTask] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [actionDialog, setActionDialog] = useState(null);
  const [actionRemarks, setActionRemarks] = useState('');
  const [adjustHours, setAdjustHours] = useState('');
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', deadline: '', assignedTo: '' });

  const { employees } = useEmployeeList();

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', statusFilter],
    queryFn: () => api.get('/tasks', { params: { status: statusFilter !== 'all' ? statusFilter : undefined, limit: 100 } }).then(r => r.data),
    refetchInterval: 30000,
  });

  const createMut = useMutation({
    mutationFn: (p) => api.post('/tasks', p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); setShowCreate(false); setForm({ title: '', description: '', priority: 'medium', deadline: '', assignedTo: '' }); toast.success('Task assigned'); },
  });

  const actionMut = useMutation({
    mutationFn: ({ id, ...body }) => api.put(`/tasks/${id}`, body),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['task-comments', res.data?.task?._id] });
      setActionDialog(null); setActionRemarks(''); setAdjustHours('');
      toast.success('Done');
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/tasks/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); toast.success('Deleted'); },
  });

  const tasks = data?.tasks || [];

  // Group by status
  const groups = {
    'IN PROGRESS': tasks.filter(t => t.status === 'accepted'),
    'IN REVIEW': tasks.filter(t => t.status === 'submitted'),
    'TO DO': tasks.filter(t => t.status === 'assigned'),
    'RETURNED': tasks.filter(t => t.status === 'returned'),
    'APPROVED': tasks.filter(t => t.status === 'approved'),
    'REJECTED': tasks.filter(t => t.status === 'rejected'),
  };

  const groupColors = {
    'IN PROGRESS': 'text-blue-500', 'IN REVIEW': 'text-amber-500',
    'TO DO': 'text-slate-500', 'RETURNED': 'text-orange-500',
    'APPROVED': 'text-emerald-500', 'REJECTED': 'text-red-500',
  };

  const statusFilterOpts = [
    { value: 'all', label: 'All Status' },
    { value: 'assigned', label: 'To Do' },
    { value: 'accepted', label: 'In Progress' },
    { value: 'submitted', label: 'In Review' },
    { value: 'returned', label: 'Returned' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ];

  return (
    <div className="h-full flex flex-col gap-0">
      {/* Toolbar */}
      <div className="flex items-center gap-2 pb-3 border-b border-border flex-wrap">
        <SimpleSelect value={statusFilter} onChange={setStatusFilter} options={statusFilterOpts} className="h-8 w-36 text-xs" />
        <div className="flex-1" />
        {canAssign && (
          <Button size="sm" className="h-8 text-xs" onClick={() => setShowCreate(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />Add Task
          </Button>
        )}
      </div>

      {/* Task Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Loading...</div>
        ) : tasks.length === 0 ? (
          <EmptyState icon={CheckSquare} title="No tasks" description="No tasks yet" />
        ) : (
          <div className="min-w-[700px]">
            {/* Header Row */}
            <div className="grid text-xs font-semibold text-muted-foreground border-b bg-muted/30 px-4 py-2"
              style={{ gridTemplateColumns: '1fr 130px 110px 90px 90px 80px 60px' }}>
              <span>Name</span>
              <span>Assignee</span>
              <span>Due date</span>
              <span>Priority</span>
              <span>Status</span>
              <span>Time</span>
              <span>Comments</span>
            </div>

            {Object.entries(groups).filter(([, tasks]) => tasks.length > 0).map(([group, groupTasks]) => (
              <GroupSection key={group} group={group} groupTasks={groupTasks} color={groupColors[group]}
                expandedTask={expandedTask} setExpandedTask={setExpandedTask}
                user={user} role={role} canAssign={canAssign}
                actionMut={actionMut} deleteMut={deleteMut}
                setActionDialog={setActionDialog} />
            ))}
          </div>
        )}
      </div>

      {/* Create Task Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Assign Task</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Task Name *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="mt-1" placeholder="Enter task title" /></div>
            <div><Label>Assign To *</Label>
              <SimpleSelect value={form.assignedTo} onChange={v => setForm({ ...form, assignedTo: v })}
                options={[{ value: '', label: 'Select employee' }, ...employees.map(e => ({ value: e._id, label: `${e.name} (${e.department})` }))]} className="mt-1" />
            </div>
            <div><Label>Description</Label><RichTextEditor content={form.description} onChange={v => setForm({ ...form, description: v })} placeholder='Add task description...' minHeight={80} className='mt-1' /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Priority</Label>
                <SimpleSelect value={form.priority} onChange={v => setForm({ ...form, priority: v })}
                  options={[{ value: 'urgent', label: '🚩 Urgent' }, { value: 'high', label: '⚠️ High' }, { value: 'medium', label: '🔵 Medium' }, { value: 'low', label: '⬇️ Low' }]} className="mt-1" />
              </div>
              <div><Label>Due Date</Label><Input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} className="mt-1" /></div>
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

      {/* Action Dialog */}
      <Dialog open={!!actionDialog} onOpenChange={() => setActionDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{actionDialog?.action === 'approve' ? '✅ Approve Task' : actionDialog?.action === 'return' ? '🔄 Return for Improvement' : '❌ Reject Task'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground truncate">"{actionDialog?.title}"</p>
            {actionDialog?.action === 'approve' && (
              <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                <p className="text-xs font-medium">Productive Time: <span className="text-purple-500 font-bold">{formatTime(actionDialog?.seconds)}</span></p>
                <div><Label className="text-xs">Adjust Hours (+/-)</Label>
                  <Input type="number" step="0.5" value={adjustHours} onChange={e => setAdjustHours(e.target.value)} placeholder="e.g. +1 or -0.5" className="mt-1 h-8 text-sm" />
                </div>
              </div>
            )}
            <div>
              <Label className="text-xs">{actionDialog?.action === 'approve' ? 'Remarks (optional)' : 'Reason *'}</Label>
              <textarea value={actionRemarks} onChange={e => setActionRemarks(e.target.value)} rows={3}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Cancel</Button>
            <Button onClick={() => actionMut.mutate({ id: actionDialog.id, action: actionDialog.action, remarks: actionRemarks, adjustHours })}
              disabled={actionMut.isPending || (actionDialog?.action !== 'approve' && !actionRemarks)}
              className={cn(actionDialog?.action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : actionDialog?.action === 'return' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-destructive hover:bg-destructive/90')}>
              {actionMut.isPending ? 'Processing...' : actionDialog?.action === 'approve' ? 'Approve' : actionDialog?.action === 'return' ? 'Return' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Group Section ──────────────────────────────────────────────────────────
function GroupSection({ group, groupTasks, color, expandedTask, setExpandedTask, user, role, canAssign, actionMut, deleteMut, setActionDialog }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="mb-1">
      <div className="flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-muted/20 select-none" onClick={() => setCollapsed(!collapsed)}>
        {collapsed ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
        <span className={cn('text-xs font-bold uppercase tracking-wide', color)}>{group}</span>
        <span className="text-xs text-muted-foreground ml-1">{groupTasks.length}</span>
      </div>
      {!collapsed && groupTasks.map(task => (
        <TaskRow key={task._id} task={task} expanded={expandedTask === task._id}
          onToggle={() => setExpandedTask(expandedTask === task._id ? null : task._id)}
          user={user} role={role} canAssign={canAssign}
          actionMut={actionMut} deleteMut={deleteMut} setActionDialog={setActionDialog} />
      ))}
    </div>
  );
}

// ── Task Row ──────────────────────────────────────────────────────────────
function TaskRow({ task, expanded, onToggle, user, role, canAssign, actionMut, deleteMut, setActionDialog }) {
  const qc = useQueryClient();
  const isOwner = task.userId?._id === user?._id || task.userId === user?._id;
  const cfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.assigned;
  const priCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const { employees } = useEmployeeList();

  // Per-field editing state
  const [editField, setEditField] = useState(null); // 'title'|'deadline'|'priority'|'assignee'|'description'

  const elapsed = task.timerStartedAt
    ? (task.productiveSeconds || 0) + Math.min(Math.floor((Date.now() - new Date(task.timerStartedAt).getTime()) / 1000), 7 * 3600)
    : (task.productiveSeconds || 0);

  const [liveTime, setLiveTime] = useState(elapsed);
  useEffect(() => {
    if (!task.timerStartedAt) { setLiveTime(task.productiveSeconds || 0); return; }
    setLiveTime(elapsed);
    const iv = setInterval(() => {
      const e = (task.productiveSeconds || 0) + Math.min(Math.floor((Date.now() - new Date(task.timerStartedAt).getTime()) / 1000), 7 * 3600);
      setLiveTime(e);
    }, 10000);
    return () => clearInterval(iv);
  }, [task.timerStartedAt, task.productiveSeconds]);

  const { data: commentsData } = useQuery({
    queryKey: ['task-comments', task._id],
    queryFn: () => api.get(`/tasks/${task._id}/comments`).then(r => r.data),
    enabled: expanded,
    staleTime: 15000,
  });
  const comments = commentsData?.comments || [];

  // Quick field patch — saves immediately
  const patchMut = useMutation({
    mutationFn: (patch) => api.put(`/tasks/${task._id}`, patch),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); setEditField(null); },
    onError: () => toast.error('Failed to save'),
  });

  const canEdit = canAssign;

  const stopProp = (e) => e.stopPropagation();

  return (
    <div className={cn('border-b border-border/40 last:border-0', expanded && 'bg-muted/10')}>
      {/* Row */}
      <div className="grid items-center px-4 py-1.5 hover:bg-muted/20 group"
        style={{ gridTemplateColumns: '1fr 140px 110px 110px 110px 80px 60px' }}>

        {/* ── Name ── */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors cursor-pointer shrink-0" onClick={onToggle}>
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </span>
          <div className={cn('w-2 h-2 rounded-sm shrink-0', task.timerStartedAt ? 'bg-blue-500 animate-pulse' : 'bg-muted-foreground/20')} />
          {editField === 'title' && canEdit ? (
            <input autoFocus defaultValue={task.title}
              className="flex-1 bg-transparent border-b border-primary outline-none text-sm min-w-0"
              onKeyDown={e => { if (e.key === 'Enter') patchMut.mutate({ title: e.target.value }); if (e.key === 'Escape') setEditField(null); }}
              onBlur={e => { if (e.target.value !== task.title) patchMut.mutate({ title: e.target.value }); else setEditField(null); }}
              onClick={stopProp} />
          ) : (
            <span
              className={cn('text-sm truncate flex-1 cursor-pointer', task.status === 'approved' && 'line-through text-muted-foreground')}
              onClick={onToggle}
              onDoubleClick={e => { if (canEdit) { e.stopPropagation(); setEditField('title'); } }}
              title="Double-click to edit">
              {task.title}
            </span>
          )}
          {task.timerStartedAt && <span className="text-[9px] text-emerald-500 font-bold animate-pulse shrink-0">LIVE</span>}
        </div>

        {/* ── Assignee ── */}
        <div onClick={stopProp} className="relative">
          {editField === 'assignee' && canEdit ? (
            <select autoFocus defaultValue={task.userId?._id || task.userId}
              className="w-full h-7 text-xs bg-background border border-primary rounded px-1 outline-none [&>option]:bg-background"
              onChange={e => patchMut.mutate({ assignedTo: e.target.value })}
              onBlur={() => setEditField(null)}>
              {employees.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
            </select>
          ) : (
            <div className={cn('flex items-center gap-1.5 rounded px-1 py-0.5 cursor-pointer', canEdit && 'hover:bg-muted/60')}
              onClick={() => canEdit && setEditField('assignee')}>
              {task.userId?.name ? (
                <>
                  <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                    <span className="text-[9px] font-bold text-primary">{task.userId.name.charAt(0)}</span>
                  </div>
                  <span className="text-xs text-muted-foreground truncate">{task.userId.name.split(' ')[0]}</span>
                </>
              ) : <span className="text-xs text-muted-foreground/40 flex items-center gap-1"><UserIcon className="h-3.5 w-3.5" />Assign</span>}
            </div>
          )}
        </div>

        {/* ── Due Date ── */}
        <div onClick={stopProp}>
          {editField === 'deadline' && canEdit ? (
            <input type="date" autoFocus defaultValue={task.deadline ? dayjs(task.deadline).format('YYYY-MM-DD') : ''}
              className="h-7 w-full text-xs bg-background border border-primary rounded px-2 outline-none [&::-webkit-calendar-picker-indicator]:opacity-50"
              onChange={e => patchMut.mutate({ deadline: e.target.value || null })}
              onBlur={() => setEditField(null)} />
          ) : (
            <div className={cn('flex items-center gap-1 rounded px-1 py-0.5 cursor-pointer text-xs', canEdit && 'hover:bg-muted/60',
              task.deadline && dayjs(task.deadline).isBefore(dayjs()) && task.status !== 'approved' ? 'text-red-500 font-medium' : 'text-muted-foreground')}
              onClick={() => canEdit && setEditField('deadline')}>
              {task.deadline ? (
                <><Calendar className="h-3 w-3 shrink-0" />{dayjs(task.deadline).format('MMM D')}</>
              ) : <span className="text-muted-foreground/40 flex items-center gap-1"><Calendar className="h-3 w-3" />Date</span>}
            </div>
          )}
        </div>

        {/* ── Priority ── */}
        <div onClick={stopProp}>
          {editField === 'priority' && canEdit ? (
            <select autoFocus defaultValue={task.priority}
              className="w-full h-7 text-xs bg-background border border-primary rounded px-1 outline-none [&>option]:bg-background"
              onChange={e => patchMut.mutate({ priority: e.target.value })}
              onBlur={() => setEditField(null)}>
              <option value="urgent">🚩 Urgent</option>
              <option value="high">⚠️ High</option>
              <option value="medium">🔵 Medium</option>
              <option value="low">⬇️ Low</option>
            </select>
          ) : (
            <div className={cn('flex items-center gap-1 rounded px-1 py-0.5 cursor-pointer text-xs font-medium', canEdit && 'hover:bg-muted/60', priCfg.color)}
              onClick={() => canEdit && setEditField('priority')}>
              <Flag className="h-3 w-3 shrink-0" />
              <span className="capitalize">{task.priority}</span>
            </div>
          )}
        </div>

        {/* ── Status ── */}
        <div onClick={stopProp}>
          <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold cursor-default', cfg.color)}>{cfg.label}</span>
        </div>

        {/* ── Time ── */}
        <div className="text-xs font-mono text-muted-foreground">
          {liveTime > 0 ? <span className={cn(task.timerStartedAt && 'text-purple-500')}>{formatTime(liveTime)}</span> : '—'}
        </div>

        {/* ── Comments ── */}
        <div className="text-xs text-muted-foreground flex items-center gap-1 cursor-pointer" onClick={onToggle}>
          <MessageSquare className="h-3.5 w-3.5" />
          <span>{task.commentCount || 0}</span>
        </div>
      </div>

      {/* Expanded Detail */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/30">
          {/* Description */}
          <div className="pt-3">
            {editField === 'description' && canEdit ? (
              <div className="space-y-2">
                <RichTextEditor content={task.description || ''} onChange={v => {}} key={task._id + '-desc'}
                  placeholder="Add description..." minHeight={80}
                  className="text-sm"
                />
                <div className="flex gap-2">
                  <button onClick={(e) => { const el = e.currentTarget.closest('.space-y-2').querySelector('.ProseMirror'); patchMut.mutate({ description: el?.innerHTML || '' }); }}
                    className="px-3 py-1 bg-primary text-primary-foreground rounded text-xs">Save</button>
                  <button onClick={() => setEditField(null)} className="px-3 py-1 bg-muted rounded text-xs">Cancel</button>
                </div>
              </div>
            ) : (
              <div className={cn('min-h-[28px] rounded px-2 py-1.5 text-sm cursor-pointer', canEdit && 'hover:bg-muted/40')}
                onClick={() => canEdit && setEditField('description')}>
                {task.description
                  ? <div className="prose prose-sm dark:prose-invert max-w-none text-xs [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-4 [&_ol]:pl-4 [&_strong]:font-bold [&_em]:italic [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded" dangerouslySetInnerHTML={{ __html: task.description }} />
                  : <span className="text-muted-foreground/40 text-xs">{canEdit ? 'Click to add description...' : 'No description'}</span>}
              </div>
            )}
          </div>

          {/* Approval Chain */}
          {task.approvalChain?.length > 0 && (
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Activity</p>
              {task.approvalChain.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-xs py-1 border-l-2 border-border pl-3">
                  <span className={cn('font-medium', s.action === 'approved' ? 'text-emerald-500' : s.action === 'returned' ? 'text-orange-500' : s.action === 'rejected' ? 'text-red-500' : 'text-blue-500')}>
                    {s.userId?.name || s.role}
                  </span>
                  <span className="text-muted-foreground">{s.action}</span>
                  {s.remarks && <span className="text-muted-foreground italic">— {s.remarks}</span>}
                  <span className="text-muted-foreground ml-auto text-[10px]">{dayjs(s.timestamp).format('MMM D, h:mm A')}</span>
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-1.5">
            {isOwner && task.status === 'assigned' && (
              <Button size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-700" onClick={() => actionMut.mutate({ id: task._id, action: 'accept' })} disabled={actionMut.isPending}>
                <Play className="h-3 w-3 mr-1" />Start
              </Button>
            )}
            {isOwner && task.status === 'returned' && (
              <Button size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-700" onClick={() => actionMut.mutate({ id: task._id, action: 'accept' })} disabled={actionMut.isPending}>
                <Play className="h-3 w-3 mr-1" />Resume
              </Button>
            )}
            {isOwner && task.status === 'accepted' && (
              <Button size="sm" className="h-7 text-xs bg-amber-600 hover:bg-amber-700" onClick={() => actionMut.mutate({ id: task._id, action: 'submit' })} disabled={actionMut.isPending}>
                <Send className="h-3 w-3 mr-1" />Submit for Review
              </Button>
            )}
            {canAssign && task.status === 'submitted' && (
              <>
                <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => setActionDialog({ id: task._id, action: 'approve', title: task.title, seconds: task.productiveSeconds })}>
                  <ThumbsUp className="h-3 w-3 mr-1" />Approve
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setActionDialog({ id: task._id, action: 'return', title: task.title })}>
                  <RotateCcw className="h-3 w-3 mr-1" />Return
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs text-destructive" onClick={() => setActionDialog({ id: task._id, action: 'reject', title: task.title })}>
                  <X className="h-3 w-3 mr-1" />Reject
                </Button>
              </>
            )}
            {canAssign && ['assigned', 'returned'].includes(task.status) && (
              <>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditInline(task._id)}>
                  <Edit3 className="h-3 w-3 mr-1" />Edit
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => { if (confirm('Delete this task?')) deleteMut.mutate(task._id); }}>
                  <Trash2 className="h-3 w-3 mr-1" />Delete
                </Button>
              </>
            )}
          </div>

          {/* Comments Section */}
          <CommentsSection taskId={task._id} comments={comments} user={user} />
        </div>
      )}
    </div>
  );
}

// ── Inline Edit ───────────────────────────────────────────────────────────
function InlineEdit({ task, onDone }) {
  const qc = useQueryClient();
  const [val, setVal] = useState(task.title);
  const mut = useMutation({
    mutationFn: () => api.put(`/tasks/${task._id}`, { title: val }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); onDone(); },
  });
  return (
    <input autoFocus value={val} onChange={e => setVal(e.target.value)} className="flex-1 bg-transparent border-b border-primary outline-none text-sm min-w-0"
      onKeyDown={e => { if (e.key === 'Enter') mut.mutate(); if (e.key === 'Escape') onDone(); }}
      onBlur={() => { if (val !== task.title) mut.mutate(); else onDone(); }} />
  );
}

// ── Comments Section ──────────────────────────────────────────────────────
function CommentsSection({ taskId, comments, user }) {
  const qc = useQueryClient();
  const [commentContent, setCommentContent] = useState('');
  const [editingComment, setEditingComment] = useState(null);
  const [editContent, setEditContent] = useState('');

  const commentMut = useMutation({
    mutationFn: (content) => api.post('/tasks/' + taskId + '/comments', { content }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['task-comments', taskId] }); qc.invalidateQueries({ queryKey: ['tasks'] }); setCommentContent(''); },
  });

  const editCommentMut = useMutation({
    mutationFn: ({ commentId, content }) => api.put('/tasks/' + taskId + '/comments', { commentId, content }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['task-comments', taskId] }); setEditingComment(null); setEditContent(''); toast.success('Comment updated'); },
  });

  const deleteCommentMut = useMutation({
    mutationFn: (commentId) => api.delete('/tasks/' + taskId + '/comments', { data: { commentId } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['task-comments', taskId] }); qc.invalidateQueries({ queryKey: ['tasks'] }); toast.success('Comment deleted'); },
  });

  return (
    <div className="border-t border-border/30 pt-3 space-y-3">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Comments ({comments.length})</p>

      {/* Existing comments */}
      <div className="space-y-3">
        {comments.map(comment => {
          const isMe = String(comment.userId?._id || comment.userId) === String(user?._id);
          const canDelete = isMe;
          return (
            <div key={comment._id} className="flex gap-2 group">
              <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-primary">{comment.userId?.name?.charAt(0)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold">{comment.userId?.name}</span>
                  <span className="text-[10px] text-muted-foreground">{dayjs(comment.createdAt).format('MMM D, h:mm A')}</span>
                  {comment.edited && <span className="text-[10px] text-muted-foreground italic">(edited)</span>}
                  {/* Edit/Delete — show on hover */}
                  {isMe && (
                    <div className="ml-auto flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingComment(comment._id); setEditContent(comment.content); }}
                        className="text-[10px] text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-muted">
                        Edit
                      </button>
                      <button onClick={() => { if (confirm('Delete comment?')) deleteCommentMut.mutate(comment._id); }}
                        className="text-[10px] text-red-500 hover:text-red-600 px-1.5 py-0.5 rounded hover:bg-red-50 dark:hover:bg-red-950/20">
                        Delete
                      </button>
                    </div>
                  )}
                </div>
                {editingComment === comment._id ? (
                  <div className="space-y-2">
                    <RichTextEditor content={editContent} onChange={setEditContent} minHeight={60} placeholder="Edit comment..." />
                    <div className="flex gap-2">
                      <button onClick={() => editCommentMut.mutate({ commentId: comment._id, content: editContent })}
                        disabled={editCommentMut.isPending}
                        className="px-3 py-1 bg-primary text-primary-foreground rounded text-xs hover:bg-primary/90">
                        {editCommentMut.isPending ? 'Saving...' : 'Save'}
                      </button>
                      <button onClick={() => setEditingComment(null)} className="px-3 py-1 bg-muted rounded text-xs hover:bg-muted/80">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-muted/50 rounded-xl px-3 py-2 text-xs prose prose-sm dark:prose-invert max-w-none
                    [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-4 [&_ol]:pl-4
                    [&_ul[data-type=taskList]]:list-none [&_strong]:font-bold [&_em]:italic
                    [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded [&_code]:text-[10px]
                    [&_blockquote]:border-l-2 [&_blockquote]:border-primary [&_blockquote]:pl-2 [&_blockquote]:italic"
                    dangerouslySetInnerHTML={{ __html: comment.content }} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* New Comment Input */}
      <div>
        <RichTextEditor content={commentContent} onChange={setCommentContent} placeholder="Comment or type '/' for commands..." minHeight={70} />
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-muted-foreground">Ctrl+Enter to send</span>
          <button onClick={() => { if (commentContent && commentContent !== '<p></p>') commentMut.mutate(commentContent); }}
            disabled={!commentContent || commentContent === '<p></p>' || commentMut.isPending}
            className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-40 flex items-center gap-1.5">
            <Send className="h-3 w-3" />
            {commentMut.isPending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}


