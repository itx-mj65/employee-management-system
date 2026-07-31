'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { FileText, Send, Settings, Users, AlertTriangle, CheckCircle2, ChevronDown, Calendar } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useEmployeeList } from '@/hooks/useSharedData';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

export default function ReportsPage() {
  const { user, role, isAdmin, isTeamLead, isManager } = useAuth();
  const qc = useQueryClient();
  const canManage = isAdmin || isTeamLead || isManager;

  const [showSubmit, setShowSubmit] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [dateFilter, setDateFilter] = useState('');
  const [empFilter, setEmpFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);
  const [form, setForm] = useState({ tasksCompleted: '', planTomorrow: '', remarks: '' });
  const [settingMode, setSettingMode] = useState('all');
  const [selectedUsers, setSelectedUsers] = useState([]);

  const { employees } = useEmployeeList();
  const empOptions = [{ value: 'all', label: 'All Employees' }, ...employees.map(e => ({ value: e._id, label: e.name }))];

  const { data, isLoading } = useQuery({
    queryKey: ['daily-reports', dateFilter, empFilter, page],
    queryFn: () => api.get('/reports', { params: { date: dateFilter || undefined, employeeId: empFilter, page, limit: 20 } }).then(r => r.data),
  });

  const { data: settingsData } = useQuery({
    queryKey: ['report-settings'],
    queryFn: () => api.get('/reports/settings').then(r => r.data),
    enabled: canManage,
  });

  const submitMut = useMutation({
    mutationFn: (p) => api.post('/reports', p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['daily-reports'] }); setShowSubmit(false); setForm({ tasksCompleted: '', planTomorrow: '', remarks: '' }); toast.success('Report submitted'); },
  });

  const settingsMut = useMutation({
    mutationFn: (p) => api.post('/reports/settings', p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['report-settings'] }); setShowSettings(false); toast.success('Requirement updated'); },
  });

  const disableMut = useMutation({
    mutationFn: () => api.delete('/reports/settings'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['report-settings'] }); toast.success('Requirement disabled'); },
  });

  if (isLoading) return <PageSkeleton />;

  const reports = data?.reports || [];
  const pagination = data?.pagination || {};
  const { mustSubmit, submitted } = data?.todayStatus || {};
  const activeSetting = settingsData?.settings?.find(s => s.isActive);

  return (
    <div className="space-y-5">
      {/* Submit banner for employees */}
      {mustSubmit && !submitted && (
        <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <Card className="border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/10">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center animate-pulse"><AlertTriangle className="h-5 w-5 text-white" /></div>
              <div className="flex-1"><p className="font-semibold text-sm">Daily Report Required</p><p className="text-xs text-muted-foreground">Submit your end-of-day report before checking out</p></div>
              <Button onClick={() => setShowSubmit(true)} size="sm" className="bg-amber-600 hover:bg-amber-700"><Send className="h-3.5 w-3.5 mr-1.5" />Submit Report</Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {mustSubmit && submitted && (
        <Card className="border-emerald-300 dark:border-emerald-700">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Today's report submitted ✓</p>
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <div><Input type="date" value={dateFilter} onChange={e => { setDateFilter(e.target.value); setPage(1); }} className="h-9 w-40" placeholder="Filter by date" /></div>
          {dateFilter && <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={() => setDateFilter('')}>Clear</Button>}
          {canManage && <SimpleSelect value={empFilter} onChange={v => { setEmpFilter(v); setPage(1); }} options={empOptions} className="w-40 h-9" />}
        </div>
        <div className="flex gap-2">
          {!submitted && <Button onClick={() => setShowSubmit(true)} size="sm"><Send className="h-3.5 w-3.5 mr-1.5" />Submit Report</Button>}
          {canManage && <Button variant="outline" size="sm" onClick={() => { setSettingMode(activeSetting?.mode || 'all'); setSelectedUsers(activeSetting?.specificUsers?.map(u => u._id || u) || []); setShowSettings(true); }}><Settings className="h-3.5 w-3.5 mr-1.5" />Require Reports</Button>}
        </div>
      </div>

      {/* Active setting badge */}
      {canManage && activeSetting && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FileText className="h-3.5 w-3.5" />
          <span>Reports required: <strong>{activeSetting.mode === 'all' ? 'Entire department' : `${activeSetting.specificUsers?.length} specific members`}</strong></span>
          <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive" onClick={() => disableMut.mutate()}>Disable</Button>
        </div>
      )}

      {/* Reports list */}
      {reports.length === 0 ? (
        <EmptyState icon={FileText} title="No reports" description={dateFilter ? 'No reports for this date' : 'No daily reports submitted yet'} />
      ) : (
        <div className="space-y-2">
          {reports.map((r, i) => (
            <motion.div key={r._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="border-l-4 border-l-primary/40">
                <div className="p-4 cursor-pointer" onClick={() => setExpandedId(expandedId === r._id ? null : r._id)}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><FileText className="h-4 w-4 text-primary" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{r.userId?.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{r.userId?.department}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{dayjs(r.date).format('ddd, MMM D YYYY')} · Submitted {dayjs(r.createdAt).format('h:mm A')}</p>
                    </div>
                    <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', expandedId === r._id && 'rotate-180')} />
                  </div>
                </div>
                {expandedId === r._id && (
                  <div className="border-t px-4 pb-4 space-y-3 pt-3">
                    <div><p className="text-xs font-semibold text-muted-foreground mb-1">Tasks Completed</p><p className="text-sm whitespace-pre-wrap">{r.tasksCompleted}</p></div>
                    {r.planTomorrow && <div><p className="text-xs font-semibold text-muted-foreground mb-1">Plan for Tomorrow</p><p className="text-sm whitespace-pre-wrap">{r.planTomorrow}</p></div>}
                    {r.remarks && <div><p className="text-xs font-semibold text-muted-foreground mb-1">Additional Remarks</p><p className="text-sm whitespace-pre-wrap">{r.remarks}</p></div>}
                  </div>
                )}
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={pagination.pages} total={pagination.total} onPageChange={setPage} />

      {/* Submit Report Dialog */}
      <Dialog open={showSubmit} onOpenChange={setShowSubmit}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Daily End-of-Day Report</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Tasks Completed Today *</Label><Textarea value={form.tasksCompleted} onChange={e => setForm({ ...form, tasksCompleted: e.target.value })} placeholder="List the tasks you completed today..." rows={4} className="mt-1" /></div>
            <div><Label>Plan for Tomorrow</Label><Textarea value={form.planTomorrow} onChange={e => setForm({ ...form, planTomorrow: e.target.value })} placeholder="What do you plan to work on?" rows={2} className="mt-1" /></div>
            <div><Label>Additional Remarks</Label><Textarea value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} placeholder="Anything else..." rows={2} className="mt-1" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowSubmit(false)}>Cancel</Button><Button onClick={() => submitMut.mutate(form)} disabled={submitMut.isPending}>{submitMut.isPending ? 'Submitting...' : 'Submit Report'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader><DialogTitle>Require Daily Reports</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Who must submit?</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {['all', 'specific'].map(m => (
                  <button key={m} onClick={() => setSettingMode(m)} className={cn('p-3 rounded-lg border text-sm font-medium text-center transition-all', settingMode === m ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/30')}>
                    {m === 'all' ? 'Entire Department' : 'Specific People'}
                  </button>
                ))}
              </div>
            </div>
            {settingMode === 'specific' && (
              <div>
                <Label>Select Employees</Label>
                <div className="space-y-1.5 mt-2 max-h-48 overflow-y-auto">
                  {employees.map(e => (
                    <label key={e._id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 cursor-pointer text-sm">
                      <input type="checkbox" checked={selectedUsers.includes(e._id)} onChange={ev => {
                        if (ev.target.checked) setSelectedUsers([...selectedUsers, e._id]);
                        else setSelectedUsers(selectedUsers.filter(id => id !== e._id));
                      }} className="rounded" />
                      {e.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setShowSettings(false)}>Cancel</Button><Button onClick={() => settingsMut.mutate({ mode: settingMode, specificUsers: settingMode === 'specific' ? selectedUsers : [] })} disabled={settingsMut.isPending}>{settingsMut.isPending ? 'Saving...' : 'Save'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
