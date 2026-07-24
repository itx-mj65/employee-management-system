'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, CalendarDays, CheckCircle2, XCircle, Clock, Palmtree,
  Stethoscope, Coffee, AlertTriangle, Briefcase, HelpCircle, Trash2
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import EmptyState from '@/components/shared/EmptyState';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { PageSkeleton } from '@/components/shared/LoadingSkeleton';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { cn } from '@/lib/utils';

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

function SimpleSelect({ value, onChange, options, className, placeholder }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className={cn('flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring', className)}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

const leaveTypes = [
  { value: 'sick', label: 'Sick Leave', icon: Stethoscope, color: 'text-red-500 bg-red-50 dark:bg-red-950/30' },
  { value: 'casual', label: 'Casual Leave', icon: Coffee, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/30' },
  { value: 'annual', label: 'Annual Leave', icon: Palmtree, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' },
  { value: 'emergency', label: 'Emergency', icon: AlertTriangle, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/30' },
  { value: 'unpaid', label: 'Unpaid Leave', icon: Briefcase, color: 'text-slate-500 bg-slate-50 dark:bg-slate-950/30' },
  { value: 'other', label: 'Other', icon: HelpCircle, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/30' },
];

const getLeaveConfig = (type) => leaveTypes.find(t => t.value === type) || leaveTypes[5];

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', icon: Clock },
  approved: { label: 'Approved', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', icon: XCircle },
};

export default function LeavesPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [actionLeave, setActionLeave] = useState(null); // { leave, action: 'approve'|'reject' }
  const [remarks, setRemarks] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState({ type: 'casual', startDate: '', endDate: '', reason: '' });

  const { data: usersData } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => api.get('/users').then(r => r.data),
    enabled: isAdmin,
  });
  const employees = usersData?.users?.filter(u => u.role === 'employee') || [];

  const { data, isLoading } = useQuery({
    queryKey: ['leaves', statusFilter, employeeFilter],
    queryFn: () => api.get('/leaves', { params: { status: statusFilter || undefined, employeeId: isAdmin ? employeeFilter : undefined } }).then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (p) => api.post('/leaves', p),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['leaves'] }); setShowCreate(false); setForm({ type: 'casual', startDate: '', endDate: '', reason: '' }); toast.success('Leave request submitted'); },
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, action, remarks }) => api.put(`/leaves/${id}`, { action, remarks }),
    onSuccess: (_, { action }) => { queryClient.invalidateQueries({ queryKey: ['leaves'] }); setActionLeave(null); setRemarks(''); toast.success(`Leave ${action}d`); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/leaves/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['leaves'] }); setDeleteId(null); toast.success('Leave request cancelled'); },
  });

  if (isLoading) return <PageSkeleton />;

  const leaves = data?.leaves || [];
  const stats = data?.stats || {};

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
        {[
          { label: 'Total Leaves', value: stats.totalApproved || 0, color: 'text-primary', sub: 'this year' },
          { label: 'Sick', value: stats.sick || 0, color: 'text-red-500' },
          { label: 'Casual', value: stats.casual || 0, color: 'text-blue-500' },
          { label: 'Annual', value: stats.annual || 0, color: 'text-emerald-500' },
          { label: 'Pending', value: isAdmin ? (stats.allPending || 0) : (stats.pending || 0), color: 'text-amber-500', highlight: true },
        ].map((s, i) => (
          <motion.div key={s.label} {...fadeUp} transition={{ delay: i * 0.04 }}>
            <Card className={cn(s.highlight && (isAdmin ? stats.allPending : stats.pending) > 0 && 'border-amber-300 dark:border-amber-700 bg-amber-50/30 dark:bg-amber-950/10')}>
              <CardContent className="p-4">
                <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
                <p className="text-[11px] text-muted-foreground">{s.label}{s.sub ? ` (${s.sub})` : ''}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Filters + Create */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <SimpleSelect value={statusFilter} onChange={setStatusFilter}
            options={[{ value: '', label: 'All Status' }, { value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }]}
            className="w-36" />
          {isAdmin && (
            <SimpleSelect value={employeeFilter} onChange={setEmployeeFilter}
              options={[{ value: 'all', label: 'All Employees' }, ...employees.map(e => ({ value: e._id, label: e.name }))]}
              className="w-44" />
          )}
        </div>
        {!isAdmin && <Button onClick={() => setShowCreate(true)} size="sm"><Plus className="h-4 w-4 mr-1" /> Request Leave</Button>}
      </div>

      {/* Leave list */}
      {leaves.length === 0 ? (
        <EmptyState icon={Palmtree} title="No leave requests" description={isAdmin ? 'No leave requests to review' : 'You haven\'t requested any leave yet'}
          action={!isAdmin && <Button onClick={() => setShowCreate(true)} size="sm"><Plus className="h-4 w-4 mr-1" /> Request Leave</Button>} />
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {leaves.map((leave, i) => {
              const config = getLeaveConfig(leave.type);
              const Icon = config.icon;
              const sc = statusConfig[leave.status];
              const StatusIcon = sc.icon;
              return (
                <motion.div key={leave._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <Card className={cn(
                    'overflow-hidden transition-all',
                    leave.status === 'pending' && 'border-l-4 border-l-amber-400',
                    leave.status === 'approved' && 'border-l-4 border-l-emerald-500',
                    leave.status === 'rejected' && 'border-l-4 border-l-red-500',
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Type icon */}
                        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', config.color)}>
                          <Icon className="h-5 w-5" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-semibold text-sm">{config.label}</h3>
                            <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium', sc.color)}>
                              <StatusIcon className="h-3 w-3" /> {sc.label}
                            </span>
                            <span className="text-xs font-medium text-primary">{leave.totalDays} day{leave.totalDays > 1 ? 's' : ''}</span>
                          </div>

                          {isAdmin && leave.userId && (
                            <p className="text-xs font-medium text-foreground mb-1">{leave.userId.name} — {leave.userId.department}</p>
                          )}

                          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                            <span className="flex items-center gap-1">
                              <CalendarDays className="h-3 w-3" />
                              {dayjs(leave.startDate).format('MMM D')} — {dayjs(leave.endDate).format('MMM D, YYYY')}
                            </span>
                            <span>Requested {dayjs(leave.createdAt).format('MMM D')}</span>
                          </div>

                          <p className="text-sm text-muted-foreground">{leave.reason}</p>

                          {leave.adminRemarks && (
                            <div className="mt-2 p-2 rounded-lg bg-muted/50 text-xs">
                              <span className="font-medium">Admin: </span>{leave.adminRemarks}
                            </div>
                          )}

                          {leave.approvedBy && (
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {leave.status === 'approved' ? 'Approved' : 'Rejected'} by {leave.approvedBy.name} on {dayjs(leave.approvedAt).format('MMM D')}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-1.5 shrink-0">
                          {isAdmin && leave.status === 'pending' && (
                            <>
                              <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
                                onClick={() => { setActionLeave({ leave, action: 'approve' }); setRemarks(''); }}>
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                              </Button>
                              <Button variant="destructive" size="sm" className="h-8 text-xs"
                                onClick={() => { setActionLeave({ leave, action: 'reject' }); setRemarks(''); }}>
                                <XCircle className="h-3 w-3 mr-1" /> Reject
                              </Button>
                            </>
                          )}
                          {!isAdmin && leave.status === 'pending' && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(leave._id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Create Leave Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request Leave</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Leave Type</Label>
              <div className="grid grid-cols-3 gap-2 mt-1.5">
                {leaveTypes.map(lt => (
                  <button key={lt.value} onClick={() => setForm({ ...form, type: lt.value })}
                    className={cn(
                      'flex flex-col items-center gap-1 p-3 rounded-lg border text-xs font-medium transition-all',
                      form.type === lt.value ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary' : 'border-border hover:border-primary/30'
                    )}>
                    <lt.icon className="h-4 w-4" />
                    {lt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Date</Label><Input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} min={dayjs().format('YYYY-MM-DD')} className="mt-1" /></div>
              <div><Label>End Date</Label><Input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} min={form.startDate || dayjs().format('YYYY-MM-DD')} className="mt-1" /></div>
            </div>
            {form.startDate && form.endDate && (
              <p className="text-xs text-muted-foreground">
                Duration: {(() => {
                  let d = 0, c = dayjs(form.startDate);
                  while (c.isBefore(dayjs(form.endDate)) || c.isSame(dayjs(form.endDate), 'day')) {
                    if (c.day() !== 0 && c.day() !== 6) d++;
                    c = c.add(1, 'day');
                  }
                  return d;
                })()} working day(s)
              </p>
            )}
            <div><Label>Reason</Label><Textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="Reason for leave..." rows={3} className="mt-1" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve/Reject Dialog */}
      <Dialog open={!!actionLeave} onOpenChange={() => setActionLeave(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{actionLeave?.action === 'approve' ? 'Approve' : 'Reject'} Leave</DialogTitle>
          </DialogHeader>
          {actionLeave && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-muted/50 text-sm">
                <p className="font-medium">{actionLeave.leave.userId?.name}</p>
                <p className="text-xs text-muted-foreground">{getLeaveConfig(actionLeave.leave.type).label} · {actionLeave.leave.totalDays} day(s)</p>
                <p className="text-xs text-muted-foreground">{dayjs(actionLeave.leave.startDate).format('MMM D')} — {dayjs(actionLeave.leave.endDate).format('MMM D')}</p>
              </div>
              <div><Label>Remarks (optional)</Label><Textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Add a note..." rows={2} className="mt-1" /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionLeave(null)}>Cancel</Button>
            <Button
              className={actionLeave?.action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
              variant={actionLeave?.action === 'reject' ? 'destructive' : 'default'}
              onClick={() => actionMutation.mutate({ id: actionLeave.leave._id, action: actionLeave.action, remarks })}
              disabled={actionMutation.isPending}>
              {actionMutation.isPending ? 'Processing...' : actionLeave?.action === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel leave confirm */}
      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Cancel Leave Request"
        description="This will cancel your pending leave request." onConfirm={() => deleteMutation.mutate(deleteId)} loading={deleteMutation.isPending} destructive />
    </div>
  );
}
