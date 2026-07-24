'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { LogIn, LogOut, Coffee, Timer, Clock, Users, CalendarX, CalendarCheck, TrendingUp, Download, ChevronDown } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import { PageSkeleton } from '@/components/shared/LoadingSkeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { cn } from '@/lib/utils';

const fadeUp = { initial: { opacity: 0, y: 15 }, animate: { opacity: 1, y: 0 } };

function SimpleSelect({ value, onChange, options, className, placeholder }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className={cn('flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring', className)}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export default function AttendancePage() {
  const { isAdmin } = useAuth();
  if (isAdmin) return <AdminAttendance />;
  return <EmployeeAttendance />;
}

// =================== EMPLOYEE ATTENDANCE ===================
function EmployeeAttendance() {
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(String(dayjs().month() + 1));

  const { data: todayData, isLoading } = useQuery({
    queryKey: ['attendance-today'],
    queryFn: () => api.get('/attendance/today').then(r => r.data),
  });

  const { data: breakData } = useQuery({
    queryKey: ['break-status'],
    queryFn: () => api.get('/attendance/break').then(r => r.data),
    refetchInterval: 20000,
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['attendance-history', selectedMonth],
    queryFn: () => api.get('/attendance', { params: { month: selectedMonth, year: dayjs().year() } }).then(r => r.data),
  });

  const checkInMutation = useMutation({ mutationFn: () => api.post('/attendance/check-in'), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['attendance-today'] }); toast.success('Checked in!'); } });
  const checkOutMutation = useMutation({ mutationFn: () => api.put('/attendance/check-out'), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['attendance-today'] }); toast.success('Checked out!'); } });
  const lunchMutation = useMutation({ mutationFn: (action) => api.put('/attendance/lunch', { action }), onSuccess: (_, action) => { queryClient.invalidateQueries({ queryKey: ['attendance-today'] }); toast.success(`Lunch ${action}ed`); } });
  const breakMutation = useMutation({ mutationFn: (action) => api.put('/attendance/break', { action }), onSuccess: (_, action) => { queryClient.invalidateQueries({ queryKey: ['attendance-today'] }); queryClient.invalidateQueries({ queryKey: ['break-status'] }); toast.success(`Break ${action}ed`); }, onError: (e) => toast.error(e.response?.data?.error || 'Error') });

  if (isLoading) return <PageSkeleton />;

  const att = todayData?.attendance;
  const isCheckedIn = !!att?.checkIn;
  const isCheckedOut = !!att?.checkOut;
  const lastBreak = att?.shortBreaks?.[att.shortBreaks.length - 1];
  const isOnShortBreak = lastBreak && lastBreak.start && !lastBreak.end;
  const onLunch = att?.lunchBreakStart && !att?.lunchBreakEnd;

  return (
    <div className="space-y-6">
      {/* Break queue banner */}
      {isCheckedIn && !isCheckedOut && (
        <motion.div {...fadeUp}>
          <Card className={cn(
            isOnShortBreak ? 'border-purple-300 dark:border-purple-700 bg-purple-50/30 dark:bg-purple-950/10' :
            breakData?.isAvailable ? 'border-emerald-200 dark:border-emerald-800' : 'border-amber-200 dark:border-amber-800'
          )}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                isOnShortBreak ? 'bg-purple-500 animate-pulse' : breakData?.isAvailable ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-amber-100 dark:bg-amber-900/30'
              )}>
                <Timer className={cn('h-5 w-5', isOnShortBreak ? 'text-white' : breakData?.isAvailable ? 'text-emerald-600' : 'text-amber-600')} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {isOnShortBreak ? `On Short Break (${breakData?.maxMinutes || 15} min limit)` : breakData?.isAvailable ? 'Short Break Available' : 'Break Slots Full'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isOnShortBreak 
                    ? `Since ${dayjs(lastBreak.start).format('h:mm A')} · ${breakData?.department}`
                    : breakData?.isAvailable 
                      ? `${breakData?.slotsAvailable} of ${breakData?.maxSlots} slot${breakData?.maxSlots > 1 ? 's' : ''} free · ${breakData?.maxMinutes || 15} min each · ${breakData?.department}`
                      : `${breakData?.onBreak?.map(b => b.name).join(', ')} on break · ${breakData?.department}`}
                </p>
              </div>
              {isOnShortBreak ? <Button onClick={() => breakMutation.mutate('end')} size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">End Break</Button>
                : breakData?.isAvailable ? <Button onClick={() => breakMutation.mutate('start')} size="sm" variant="outline">Start Break</Button>
                : <span className="text-xs text-amber-600 font-medium px-3 py-1.5 rounded-md bg-amber-50 dark:bg-amber-900/20">Wait</span>}
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div {...fadeUp}><Card><CardContent className="p-5 text-center">
          <Clock className="h-8 w-8 mx-auto mb-2 text-primary" />
          <p className="text-sm text-muted-foreground mb-3">{isCheckedIn ? (isCheckedOut ? 'Day Complete' : 'Working') : 'Not Checked In'}</p>
          {!isCheckedIn ? <Button onClick={() => checkInMutation.mutate()} disabled={checkInMutation.isPending} className="w-full" size="sm"><LogIn className="h-4 w-4 mr-1" /> Check In</Button>
            : !isCheckedOut ? <Button onClick={() => checkOutMutation.mutate()} disabled={checkOutMutation.isPending} variant="outline" className="w-full" size="sm"><LogOut className="h-4 w-4 mr-1" /> Check Out</Button>
            : <p className="text-xs text-muted-foreground">{dayjs(att.checkIn).format('h:mm A')} — {dayjs(att.checkOut).format('h:mm A')}</p>}
        </CardContent></Card></motion.div>

        <motion.div {...fadeUp} transition={{ delay: 0.08 }}>
          <Card className={cn('transition-all', onLunch && 'ring-2 ring-amber-400 border-amber-400 bg-amber-50/50 dark:bg-amber-950/20 shadow-lg shadow-amber-100 dark:shadow-amber-900/20')}>
            <CardContent className="p-5 text-center">
              <div className={cn('w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center', onLunch ? 'bg-amber-500 animate-pulse' : 'bg-amber-100 dark:bg-amber-900/30')}>
                <Coffee className={cn('h-7 w-7', onLunch ? 'text-white' : 'text-amber-500')} />
              </div>
              <p className={cn('text-sm font-medium mb-1', onLunch && 'text-amber-700 dark:text-amber-300')}>Lunch Break</p>
              {onLunch && <p className="text-xs text-amber-600 font-medium mb-2 animate-pulse">🍽️ Since {dayjs(att.lunchBreakStart).format('h:mm A')}</p>}
              <div className="mt-2">
                {!isCheckedIn || isCheckedOut ? <Button disabled size="sm" variant="outline" className="w-full">Unavailable</Button>
                  : !att?.lunchBreakStart ? <Button onClick={() => lunchMutation.mutate('start')} size="sm" variant="outline" className="w-full border-amber-300 text-amber-700">Start Lunch</Button>
                  : !att?.lunchBreakEnd ? <Button onClick={() => lunchMutation.mutate('end')} size="sm" className="w-full bg-amber-500 hover:bg-amber-600 text-white">End Lunch</Button>
                  : <p className="text-xs text-muted-foreground">✓ {dayjs(att.lunchBreakStart).format('h:mm')} – {dayjs(att.lunchBreakEnd).format('h:mm A')}</p>}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div {...fadeUp} transition={{ delay: 0.16 }}><Card><CardContent className="p-5 text-center">
          <Timer className="h-8 w-8 mx-auto mb-2 text-purple-500" /><p className="text-sm text-muted-foreground mb-1">Short Breaks</p><p className="text-lg font-bold mb-1">{att?.shortBreaks?.length || 0}</p><p className="text-[10px] text-muted-foreground">taken today</p>
        </CardContent></Card></motion.div>

        <motion.div {...fadeUp} transition={{ delay: 0.24 }}><Card><CardContent className="p-5 text-center">
          <Clock className="h-8 w-8 mx-auto mb-2 text-emerald-500" /><p className="text-sm text-muted-foreground mb-1">Hours</p><p className="text-2xl font-bold">{(att?.totalWorkingHours || 0).toFixed(1)}h</p><p className="text-xs text-muted-foreground">Break: {(att?.totalBreakHours || 0).toFixed(1)}h</p>
        </CardContent></Card></motion.div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">History</CardTitle>
          <SimpleSelect value={selectedMonth} onChange={setSelectedMonth} options={Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: dayjs().month(i).format('MMMM') }))} className="w-32" />
        </CardHeader>
        <CardContent>
          {!historyData?.attendance?.length ? <EmptyState title="No records" /> : (
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left">
              <th className="pb-2 font-medium">Date</th><th className="pb-2 font-medium">In</th><th className="pb-2 font-medium">Out</th><th className="pb-2 font-medium">Hours</th><th className="pb-2 font-medium">Status</th>
            </tr></thead><tbody>{historyData.attendance.map(a => (
              <tr key={a._id} className="border-b last:border-0"><td className="py-2">{dayjs(a.date).format('MMM D')}</td><td className="py-2">{a.checkIn ? dayjs(a.checkIn).format('h:mm A') : '—'}</td><td className="py-2">{a.checkOut ? dayjs(a.checkOut).format('h:mm A') : '—'}</td><td className="py-2">{(a.totalWorkingHours || 0).toFixed(1)}h</td><td className="py-2"><StatusBadge status={a.status} /></td></tr>
            ))}</tbody></table></div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// =================== ADMIN ATTENDANCE ===================
function AdminAttendance() {
  const queryClient = useQueryClient();
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [fromDate, setFromDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [toDate, setToDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [expandedEmp, setExpandedEmp] = useState(null);

  const { data: usersData } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => api.get('/users').then(r => r.data),
  });
  const employees = usersData?.users?.filter(u => u.role === 'employee') || [];
  const empOptions = [{ value: 'all', label: 'All Employees' }, ...employees.map(e => ({ value: e._id, label: e.name }))];

  const { data: todayData } = useQuery({
    queryKey: ['attendance-today'],
    queryFn: () => api.get('/attendance/today').then(r => r.data),
  });

  const { data: breakData } = useQuery({
    queryKey: ['break-status'],
    queryFn: () => api.get('/attendance/break').then(r => r.data),
    refetchInterval: 20000,
  });

  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['attendance-analytics', employeeFilter, fromDate, toDate],
    queryFn: () => api.get('/attendance/analytics', { params: { employeeId: employeeFilter, from: fromDate, to: toDate } }).then(r => r.data),
  });

  if (isLoading) return <PageSkeleton />;

  const reports = analyticsData?.employeeReports || [];
  const chart = analyticsData?.dailyPresenceChart || [];
  const summary = analyticsData?.summary || {};
  const allToday = todayData?.attendance || [];

  const attendancePie = reports.length > 0 ? [
    { name: 'Present', value: reports.reduce((s, r) => s + r.presentCount, 0), fill: '#22c55e' },
    { name: 'Absent', value: reports.reduce((s, r) => s + r.absentCount, 0), fill: '#ef4444' },
  ].filter(d => d.value > 0) : [];

  const empBarData = reports.map(r => ({
    name: r.employee.name.split(' ')[0],
    present: r.presentCount,
    absent: r.absentCount,
    rate: r.attendanceRate,
  }));

  const statusColors = { present: 'bg-emerald-500', absent: 'bg-red-500', weekend: 'bg-slate-300 dark:bg-slate-700', holiday: 'bg-blue-400', future: 'bg-muted', leave: 'bg-orange-400' };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <motion.div {...fadeUp}>
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
              <div className="flex-1"><Label className="text-xs mb-1 block">Employee</Label><SimpleSelect value={employeeFilter} onChange={setEmployeeFilter} options={empOptions} className="w-full" /></div>
              <div><Label className="text-xs mb-1 block">From</Label><Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="h-9" /></div>
              <div><Label className="text-xs mb-1 block">To</Label><Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="h-9" /></div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Summary cards */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {[
          { icon: Users, label: 'Employees', value: summary.totalEmployees, color: 'bg-blue-500' },
          { icon: CalendarCheck, label: 'Working Days', value: summary.workingDays, color: 'bg-indigo-500' },
          { icon: TrendingUp, label: 'Avg Attendance', value: `${summary.avgAttendanceRate}%`, color: 'bg-emerald-500' },
          { icon: CalendarX, label: 'Holidays', value: summary.holidays, color: 'bg-purple-500' },
        ].map((s, i) => (
          <motion.div key={s.label} {...fadeUp} transition={{ delay: i * 0.05 }}>
            <Card><CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center`}><s.icon className="h-5 w-5 text-white" /></div>
              <div><p className="text-xl font-bold">{s.value}</p><p className="text-[11px] text-muted-foreground">{s.label}</p></div>
            </CardContent></Card>
          </motion.div>
        ))}
      </div>

      {/* Break status */}
      <motion.div {...fadeUp}>
        <Card className={cn(breakData?.isAvailable ? 'border-emerald-200 dark:border-emerald-800' : 'border-amber-200 dark:border-amber-800')}>
          <CardContent className="p-3 flex items-center gap-3">
            <Timer className={cn('h-4 w-4', breakData?.isAvailable ? 'text-emerald-600' : 'text-amber-600')} />
            <p className="text-sm">{breakData?.isAvailable ? 'Break slot available' : `${breakData?.onBreak?.name} on break since ${dayjs(breakData?.onBreak?.startedAt).format('h:mm A')}`}</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader><CardTitle className="text-base">Daily Presence Trend</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                {chart.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chart}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }} />
                      <YAxis tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }} />
                      <Tooltip contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="present" fill="#22c55e" radius={[2, 2, 0, 0]} name="Present" stackId="a" />
                      <Bar dataKey="absent" fill="#ef4444" radius={[2, 2, 0, 0]} name="Absent" stackId="a" />
                      <Legend />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-muted-foreground text-center py-8">No data</p>}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div {...fadeUp} transition={{ delay: 0.15 }}>
          <Card>
            <CardHeader><CardTitle className="text-base">Overall Attendance</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center">
                {attendancePie.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={attendancePie} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                        {attendancePie.map((e, i) => <Cell key={i} fill={e.fill} />)}
                      </Pie><Tooltip /><Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-muted-foreground">No data</p>}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {reports.length > 1 && (
          <motion.div {...fadeUp} transition={{ delay: 0.2 }} className="lg:col-span-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Attendance by Employee</CardTitle></CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={empBarData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }} />
                      <YAxis tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }} />
                      <Tooltip contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="present" fill="#22c55e" radius={[2, 2, 0, 0]} name="Present" />
                      <Bar dataKey="absent" fill="#ef4444" radius={[2, 2, 0, 0]} name="Absent" />
                      <Legend />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Employee detail cards */}
      <motion.div {...fadeUp} transition={{ delay: 0.25 }}>
        <Card>
          <CardHeader><CardTitle className="text-base">Employee Reports</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {reports.map((r) => (
              <div key={r.employee._id} className="border rounded-lg overflow-hidden">
                {/* Summary row */}
                <div className="p-4 flex items-center gap-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedEmp(expandedEmp === r.employee._id ? null : r.employee._id)}>
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-medium text-primary">{r.employee.name.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{r.employee.name}</p>
                    <p className="text-xs text-muted-foreground">{r.employee.department || r.employee.position}</p>
                  </div>
                  <div className="hidden sm:flex gap-6 text-center">
                    <div><p className="text-lg font-bold text-emerald-600">{r.presentCount}</p><p className="text-[10px] text-muted-foreground">Present</p></div>
                    <div><p className="text-lg font-bold text-red-600">{r.absentCount}</p><p className="text-[10px] text-muted-foreground">Absent</p></div>
                    <div><p className="text-lg font-bold">{r.totalHours}h</p><p className="text-[10px] text-muted-foreground">Hours</p></div>
                    <div><p className={cn('text-lg font-bold', r.attendanceRate >= 80 ? 'text-emerald-600' : r.attendanceRate >= 60 ? 'text-amber-600' : 'text-red-600')}>{r.attendanceRate}%</p><p className="text-[10px] text-muted-foreground">Rate</p></div>
                  </div>
                  <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', expandedEmp === r.employee._id && 'rotate-180')} />
                </div>

                {/* Expanded detail */}
                {expandedEmp === r.employee._id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="border-t">
                    <div className="p-4 space-y-4">
                      {/* Stats row for mobile */}
                      <div className="sm:hidden grid grid-cols-4 gap-2 text-center">
                        <div><p className="font-bold text-emerald-600">{r.presentCount}</p><p className="text-[10px]">Present</p></div>
                        <div><p className="font-bold text-red-600">{r.absentCount}</p><p className="text-[10px]">Absent</p></div>
                        <div><p className="font-bold">{r.totalHours}h</p><p className="text-[10px]">Hours</p></div>
                        <div><p className="font-bold">{r.attendanceRate}%</p><p className="text-[10px]">Rate</p></div>
                      </div>

                      <div className="grid grid-cols-4 gap-3 text-sm">
                        <div className="p-2 rounded-lg bg-muted/50"><p className="text-xs text-muted-foreground">Avg Hours/Day</p><p className="font-semibold">{r.avgHoursPerDay}h</p></div>
                        <div className="p-2 rounded-lg bg-muted/50"><p className="text-xs text-muted-foreground">Break Hours</p><p className="font-semibold">{r.totalBreakHours}h</p></div>
                        <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-950/20"><p className="text-xs text-muted-foreground">Leave Days</p><p className="font-semibold text-orange-600">{r.leaveCount || 0}</p></div>
                        <div className="p-2 rounded-lg bg-muted/50"><p className="text-xs text-muted-foreground">Late Check-ins</p><p className="font-semibold">{r.lateCheckIns}</p></div>
                      </div>

                      {/* Absent days list */}
                      {r.absentDays.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-red-600 mb-2 flex items-center gap-1"><CalendarX className="h-3 w-3" /> Absent Days ({r.absentDays.length})</p>
                          <div className="flex flex-wrap gap-1.5">
                            {r.absentDays.map(d => (
                              <span key={d.date} className="px-2 py-1 rounded-md text-xs bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-800">
                                {d.day}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Calendar heatmap */}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Daily Breakdown</p>
                        <div className="flex flex-wrap gap-1">
                          {r.dailyBreakdown.map(d => (
                            <div key={d.date} className="group relative">
                              <div className={cn('w-7 h-7 rounded-md flex items-center justify-center text-[9px] font-medium transition-all',
                                statusColors[d.status] || 'bg-muted',
                                d.status === 'present' && 'text-white',
                                d.status === 'absent' && 'text-white',
                                d.status === 'leave' && 'text-white',
                                d.status === 'weekend' && 'text-muted-foreground',
                                d.status === 'holiday' && 'text-white',
                                d.status === 'future' && 'text-muted-foreground',
                              )}>
                                {dayjs(d.date).format('D')}
                              </div>
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-popover border rounded-md text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-md">
                                {d.fullDay} — {d.status === 'present' ? `✓ ${d.hours?.toFixed(1)}h` : d.status === 'holiday' ? `🎉 ${d.holidayName || 'Holiday'}` : d.status === 'leave' ? `🏖️ ${d.leaveType || 'Leave'}` : d.status}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500" /> Present</span>
                          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500" /> Absent</span>
                          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-400" /> Leave</span>
                          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-400" /> Holiday</span>
                          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-300 dark:bg-slate-700" /> Weekend</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Today's live attendance */}
      <motion.div {...fadeUp} transition={{ delay: 0.3 }}>
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Today Live ({allToday.length} checked in)</CardTitle></CardHeader>
          <CardContent>
            {allToday.length === 0 ? <p className="text-sm text-muted-foreground">No one checked in yet</p> : (
              <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left">
                <th className="pb-2 font-medium">Employee</th><th className="pb-2 font-medium">In</th><th className="pb-2 font-medium">Out</th><th className="pb-2 font-medium">Break</th><th className="pb-2 font-medium">Status</th>
              </tr></thead><tbody>{allToday.map(a => {
                const lb = a.shortBreaks?.[a.shortBreaks.length - 1];
                const onShort = lb && lb.start && !lb.end;
                const onL = a.lunchBreakStart && !a.lunchBreakEnd;
                return (<tr key={a._id} className="border-b last:border-0">
                  <td className="py-2.5">{a.userId?.name}</td>
                  <td className="py-2.5">{a.checkIn ? dayjs(a.checkIn).format('h:mm A') : '—'}</td>
                  <td className="py-2.5">{a.checkOut ? dayjs(a.checkOut).format('h:mm A') : '—'}</td>
                  <td className="py-2.5">{onShort ? <span className="text-xs font-medium text-purple-600 bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded">Short</span> : onL ? <span className="text-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded">Lunch</span> : '—'}</td>
                  <td className="py-2.5"><StatusBadge status={a.status} /></td>
                </tr>);
              })}</tbody></table></div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
