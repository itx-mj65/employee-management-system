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
  const [editInline, setEditInline] = useState(null);
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
                setActionDialog={setActionDialog} editInline={editInline} setEditInline={setEditInline} />
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
            <div><Label>Description</Label><RichTextInput value={form.description} onChange={v => setForm({ ...form, description: v })} /></div>
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
function GroupSection({ group, groupTasks, color, expandedTask, setExpandedTask, user, role, canAssign, actionMut, deleteMut, setActionDialog, editInline, setEditInline }) {
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
          actionMut={actionMut} deleteMut={deleteMut} setActionDialog={setActionDialog}
          editInline={editInline} setEditInline={setEditInline} />
      ))}
    </div>
  );
}

// ── Task Row ──────────────────────────────────────────────────────────────
function TaskRow({ task, expanded, onToggle, user, role, canAssign, actionMut, deleteMut, setActionDialog, editInline, setEditInline }) {
  const qc = useQueryClient();
  const isOwner = task.userId?._id === user?._id || task.userId === user?._id;
  const cfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.assigned;
  const priCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;

  const elapsed = task.timerStartedAt
    ? (task.productiveSeconds || 0) + Math.min(Math.floor((Date.now() - new Date(task.timerStartedAt).getTime()) / 1000), 7 * 3600)
    : (task.productiveSeconds || 0);

  const [liveTime, setLiveTime] = useState(elapsed);
  useEffect(() => {
    if (!task.timerStartedAt) { setLiveTime(task.productiveSeconds || 0); return; }
    setLiveTime(elapsed);
    const iv = setInterval(() => {
      const newElapsed = (task.productiveSeconds || 0) + Math.min(Math.floor((Date.now() - new Date(task.timerStartedAt).getTime()) / 1000), 7 * 3600);
      setLiveTime(newElapsed);
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

  return (
    <div className={cn('border-b border-border/40 last:border-0', expanded && 'bg-muted/10')}>
      {/* Row */}
      <div className="grid items-center px-4 py-2 hover:bg-muted/20 group"
        style={{ gridTemplateColumns: '1fr 130px 110px 90px 90px 80px 60px' }}>
        {/* Name */}
        <div className="flex items-center gap-2 min-w-0 cursor-pointer" onClick={onToggle}>
          <span className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors">{expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}</span>
          <div className={cn('w-2 h-2 rounded-sm shrink-0 mt-0.5', task.timerStartedAt ? 'bg-blue-500 animate-pulse' : 'bg-muted-foreground/30')} />
          {editInline === task._id ? (
            <InlineEdit task={task} onDone={() => setEditInline(null)} />
          ) : (
            <span className={cn('text-sm truncate', task.status === 'approved' && 'line-through text-muted-foreground')} onDoubleClick={() => canAssign && setEditInline(task._id)}>
              {task.title}
            </span>
          )}
        </div>
        {/* Assignee */}
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center">
            <span className="text-[10px] font-bold text-primary">{task.userId?.name?.charAt(0)}</span>
          </div>
          <span className="text-xs text-muted-foreground truncate">{task.userId?.name?.split(' ')[0]}</span>
        </div>
        {/* Due date */}
        <div className="text-xs text-muted-foreground">
          {task.deadline ? <span className={cn(dayjs(task.deadline).isBefore(dayjs()) && task.status !== 'approved' && 'text-red-500 font-medium')}>{dayjs(task.deadline).format('MMM D')}</span> : '—'}
        </div>
        {/* Priority */}
        <div className={cn('text-xs font-medium', priCfg.color)}>
          {priCfg.icon} {task.priority}
        </div>
        {/* Status */}
        <div>
          <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold', cfg.color)}>{cfg.label}</span>
        </div>
        {/* Time */}
        <div className="text-xs font-mono text-muted-foreground">
          {liveTime > 0 ? <span className={cn(task.timerStartedAt && 'text-purple-500')}>{formatTime(liveTime)}</span> : '—'}
        </div>
        {/* Comments count */}
        <div className="text-xs text-muted-foreground flex items-center gap-1 cursor-pointer" onClick={onToggle}>
          <MessageSquare className="h-3.5 w-3.5" />
          <span>{task.commentCount || 0}</span>
        </div>
      </div>

      {/* Expanded Detail */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/30">
          {/* Description */}
          {task.description && (
            <div className="pt-3">
              <p className="text-xs text-muted-foreground whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

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
  const [text, setText] = useState('');
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const inputRef = useRef(null);

  const commentMut = useMutation({
    mutationFn: (content) => api.post(`/tasks/${taskId}/comments`, { content }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['task-comments', taskId] }); qc.invalidateQueries({ queryKey: ['tasks'] }); setText(''); },
  });

  return (
    <div className="border-t border-border/30 pt-3">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Comments</p>

      {/* Existing comments */}
      {comments.map(c => {
        const isMe = String(c.userId?._id || c.userId) === String(user?._id);
        return (
          <div key={c._id} className={cn('flex gap-2 mb-2', isMe && 'flex-row-reverse')}>
            <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-[9px] font-bold text-primary">{c.userId?.name?.charAt(0)}</span>
            </div>
            <div className={cn('max-w-[75%]', isMe ? 'items-end' : 'items-start')}>
              <p className="text-[10px] text-muted-foreground mb-0.5 px-1">{c.userId?.name} · {dayjs(c.createdAt).format('h:mm A')}</p>
              <div className={cn('px-3 py-2 rounded-xl text-xs', isMe ? 'bg-primary text-primary-foreground' : 'bg-muted')} dangerouslySetInnerHTML={{ __html: c.content }} />
            </div>
          </div>
        );
      })}

      {/* Rich comment input — ClickUp style */}
      <div className="border border-border rounded-lg overflow-hidden mt-2">
        {/* Formatting toolbar */}
        <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border bg-muted/20">
          <button onClick={() => setBold(!bold)} className={cn('p-1 rounded text-xs hover:bg-muted', bold && 'bg-muted')}><Bold className="h-3 w-3" /></button>
          <button onClick={() => setItalic(!italic)} className={cn('p-1 rounded text-xs hover:bg-muted', italic && 'bg-muted')}><Italic className="h-3 w-3" /></button>
          <button className="p-1 rounded text-xs hover:bg-muted"><Underline className="h-3 w-3" /></button>
          <div className="w-px h-4 bg-border mx-1" />
          <button className="p-1 rounded text-xs hover:bg-muted"><List className="h-3 w-3" /></button>
          <button className="p-1 rounded text-xs hover:bg-muted"><AlignLeft className="h-3 w-3" /></button>
          <button className="p-1 rounded text-xs hover:bg-muted"><Link className="h-3 w-3" /></button>
          <div className="w-px h-4 bg-border mx-1" />
          {/* Demo only — file/image/video */}
          <button className="p-1 rounded text-xs hover:bg-muted opacity-50" title="Image (coming soon)"><ImageIcon className="h-3 w-3" /></button>
          <button className="p-1 rounded text-xs hover:bg-muted opacity-50" title="File (coming soon)"><Paperclip className="h-3 w-3" /></button>
          <button className="p-1 rounded text-xs hover:bg-muted opacity-50" title="Video (coming soon)"><Video className="h-3 w-3" /></button>
        </div>
        {/* Input */}
        <div className="flex items-end gap-2 p-2">
          <textarea
            ref={inputRef}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Comment or type '/' for commands..."
            rows={1}
            className={cn(
              'flex-1 bg-transparent text-xs resize-none outline-none min-h-[28px] max-h-32 overflow-y-auto',
              bold && 'font-bold',
              italic && 'italic'
            )}
            onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && text.trim()) { e.preventDefault(); commentMut.mutate(text.trim()); } }}
          />
          <button onClick={() => { if (text.trim()) commentMut.mutate(text.trim()); }}
            disabled={!text.trim() || commentMut.isPending}
            className="p-1.5 rounded-lg bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors shrink-0">
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="px-2 pb-1.5 flex items-center gap-3 text-[10px] text-muted-foreground">
          <span>Press Enter to send · Shift+Enter for new line</span>
        </div>
      </div>
    </div>
  );
}

// ── Rich Text Input for task description ─────────────────────────────────
function RichTextInput({ value, onChange }) {
  return (
    <div className="mt-1 border border-input rounded-lg overflow-hidden">
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border bg-muted/20">
        <button type="button" className="p-1 rounded hover:bg-muted"><Bold className="h-3 w-3" /></button>
        <button type="button" className="p-1 rounded hover:bg-muted"><Italic className="h-3 w-3" /></button>
        <button type="button" className="p-1 rounded hover:bg-muted"><List className="h-3 w-3" /></button>
        <button type="button" className="p-1 rounded hover:bg-muted"><Link className="h-3 w-3" /></button>
      </div>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={3}
        placeholder="Add task description..." className="w-full bg-transparent px-3 py-2 text-sm resize-none outline-none" />
    </div>
  );
}
