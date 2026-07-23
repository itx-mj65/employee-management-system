'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { TrendingUp, Star } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import EmptyState from '@/components/shared/EmptyState';
import { PageSkeleton } from '@/components/shared/LoadingSkeleton';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

export default function PerformancePage() {
  const { isAdmin, user } = useAuth();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(String(dayjs().month() + 1));
  const [selectedYear] = useState(String(dayjs().year()));
  const [form, setForm] = useState({ remarks: '', performanceScore: '' });

  const { data: usersData } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => api.get('/users').then(r => r.data),
    enabled: isAdmin,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['remarks', selectedEmployee, selectedMonth, selectedYear],
    queryFn: () => api.get('/remarks', {
      params: { employeeId: selectedEmployee || undefined, month: selectedMonth, year: selectedYear }
    }).then(r => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: (payload) => api.post('/remarks', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['remarks'] });
      setShowAdd(false);
      toast.success('Remarks saved');
    },
  });

  if (isLoading) return <PageSkeleton />;

  const remarks = data?.remarks || [];
  const employees = usersData?.users?.filter(u => u.role === 'employee') || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger className="w-48"><SelectValue placeholder="All Employees" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {employees.map(e => <SelectItem key={e._id} value={e._id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>{dayjs().month(i).format('MMMM')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowAdd(true)} size="sm"><Star className="h-4 w-4 mr-1" /> Add Remarks</Button>
        )}
      </div>

      {remarks.length === 0 ? (
        <EmptyState icon={TrendingUp} title="No performance data" description="No remarks for this period" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {remarks.map((r) => (
            <motion.div key={r._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-medium text-sm">{r.userId?.name}</p>
                      <p className="text-xs text-muted-foreground">{dayjs().month(r.month - 1).format('MMMM')} {r.year}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">{r.performanceScore}</p>
                      <p className="text-xs text-muted-foreground">Score</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                      <p className="text-lg font-bold text-emerald-600">{r.completedTasks}</p>
                      <p className="text-[10px] text-muted-foreground">Completed</p>
                    </div>
                    <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                      <p className="text-lg font-bold text-amber-600">{r.pendingTasks}</p>
                      <p className="text-[10px] text-muted-foreground">Pending</p>
                    </div>
                    <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <p className="text-lg font-bold text-red-600">{r.rejectedTasks}</p>
                      <p className="text-[10px] text-muted-foreground">Rejected</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Attendance: {r.attendancePercentage}%</span>
                    <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${r.attendancePercentage}%` }} />
                    </div>
                  </div>
                  {r.remarks && (
                    <div className="mt-3 p-2 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">Remarks: {r.remarks}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Remarks */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Monthly Remarks</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Employee</Label>
              <Select value={form.userId || ''} onValueChange={v => setForm({ ...form, userId: v })}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map(e => <SelectItem key={e._id} value={e._id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Month</Label>
                <Select value={form.month || selectedMonth} onValueChange={v => setForm({ ...form, month: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{dayjs().month(i).format('MMMM')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Score (0-100)</Label>
                <Input type="number" min="0" max="100" value={form.performanceScore} onChange={e => setForm({ ...form, performanceScore: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Remarks</Label>
              <Textarea value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate({
              userId: form.userId,
              month: parseInt(form.month || selectedMonth),
              year: parseInt(selectedYear),
              performanceScore: parseInt(form.performanceScore) || 0,
              remarks: form.remarks,
            })} disabled={saveMutation.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
