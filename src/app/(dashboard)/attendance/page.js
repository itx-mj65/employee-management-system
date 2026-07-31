'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { LogIn, LogOut, Coffee, Timer, Clock, Users, CalendarX, CalendarCheck, TrendingUp, ChevronDown } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useEmployeeList } from '@/hooks/useSharedData';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import { PageSkeleton } from '@/components/shared/LoadingSkeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { cn } from '@/lib/utils';
import SimpleSelect from '@/components/shared/SimpleSelect';
import CheckoutRequests from '@/components/shared/CheckoutRequests';

const fadeUp = { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.15 } };


export default function AttendancePage() {
  const { isAdmin, role } = useAuth();
  if (isAdmin || role === 'manager') return <AdminAttendance />;
  return <EmployeeAttendance />;
}

function EmployeeAttendance() {
  const qc = useQueryClient();
  const [histMonth, setHistMonth] = useState(dayjs().month() + 1);
  const [histYear, setHistYear] = useState(dayjs().year());
  const [localState, setLocalState] = useState({});

  const { data, isLoading } = useQuery({
    queryKey: ['emp-attendance-data'],
    queryFn: async () => {
      const [todayRes, breakRes] = await Promise.all([
        api.get('/attendance/today'),
        api.get('/attendance/break'),
      ]);
      return { attendance: todayRes.data.attendance, break: breakRes.data };
    },
  });

  const { data: historyData, isLoading: histLoading } = useQuery({
    queryKey: ['attendance-history', histMonth, histYear],
    queryFn: () => api.get('/attendance', { params: { month: histMonth, year: histYear } }).then(r => r.data),
  });

  const quickMut = (fn, msg, stateKey, stateVal) => ({
    mutationFn: fn,
    onSuccess: () => {
      setLocalState(prev => ({ ...prev, [stateKey]: stateVal }));
      toast.success(msg);
      qc.invalidateQueries({ queryKey: ['emp-attendance-data'] });
    },
  });

  const checkInMut = useMutation(quickMut(() => api.post('/attendance/check-in'), 'Checked in!', 'checkedIn', true));
  const checkOutMut = useMutation(quickMut(() => api.put('/attendance/check-out'), 'Checked out!', 'checkedOut', true));
  const lunchMut = useMutation({
    mutationFn: (a) => api.put('/attendance/lunch', { action: a }),
    onSuccess: (_, action) => { setLocalState(prev => ({ ...prev, lunch: action })); toast.success('Done'); qc.invalidateQueries({ queryKey: ['emp-attendance-data'] }); },
  });
  const breakMut = useMutation({
    mutationFn: (a) => api.put('/attendance/break', { action: a }),
    onSuccess: (_, action) => { setLocalState(prev => ({ ...prev, break: action })); toast.success('Done'); qc.invalidateQueries({ queryKey: ['emp-attendance-data'] }); },
  });

  if (isLoading) return <PageSkeleton />;

  const att = data?.attendance;
  const brk = data?.break;
  const isIn = localState.checkedIn || !!att?.checkIn;
  const isOut = localState.checkedOut || !!att?.checkOut;
  const onLunch = localState.lunch === 'start' ? true : localState.lunch === 'end' ? false : (att?.lunchBreakStart && !att?.lunchBreakEnd);
  const lastB = att?.shortBreaks?.[att.shortBreaks.length - 1];
  const onBreak = localState.break === 'start' ? true : localState.break === 'end' ? false : (lastB && lastB.start && !lastB.end);

  return (
    <div className="space-y-6">
      {isIn && !isOut && (
        <motion.div {...fadeUp}>
          <Card className={cn(onBreak ? 'border-purple-300 dark:border-purple-700 bg-purple-50/30 dark:bg-purple-950/10' : brk?.isAvailable ? 'border-emerald-200 dark:border-emerald-800' : 'border-amber-200 dark:border-amber-800')}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', onBreak ? 'bg-purple-500 animate-pulse' : brk?.isAvailable ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-amber-100 dark:bg-amber-900/30')}>
                <Timer className={cn('h-5 w-5', onBreak ? 'text-white' : brk?.isAvailable ? 'text-emerald-600' : 'text-amber-600')} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{onBreak ? `On Break (${brk?.maxMinutes || 15} min)` : brk?.isAvailable ? 'Break Available' : 'Break Occupied'}</p>
                <p className="text-xs text-muted-foreground">{onBreak ? `Since ${dayjs(lastB.start).format('h:mm A')}` : brk?.isAvailable ? `${brk.slotsAvailable}/${brk.maxSlots} free · ${brk.department}` : `${brk?.onBreak?.map(b => b.name).join(', ')} · ${brk?.department}`}</p>
              </div>
              {onBreak ? <Button onClick={() => breakMut.mutate('end')} disabled={breakMut.isPending} size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
                {breakMut.isPending ? <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />Ending...</> : 'End Break'}
              </Button>
                : brk?.isAvailable ? <Button onClick={() => breakMut.mutate('start')} disabled={breakMut.isPending} size="sm" variant="outline">
                {breakMut.isPending ? <><span className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-1.5" />Starting...</> : 'Start Break'}
              </Button>
                : <span className="text-xs text-amber-600 font-medium px-3 py-1.5 rounded-md bg-amber-50 dark:bg-amber-900/20">Wait</span>}
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div {...fadeUp}><Card><CardContent className="p-5 text-center">
          <Clock className="h-8 w-8 mx-auto mb-2 text-primary" />
          <p className="text-sm text-muted-foreground mb-3">{isIn ? (isOut ? 'Done' : 'Working') : 'Not In'}</p>
          {!isIn ? <Button onClick={() => checkInMut.mutate()} disabled={checkInMut.isPending} className="w-full" size="sm">
            {checkInMut.isPending ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Checking In...</> : <><LogIn className="h-4 w-4 mr-1" />Check In</>}
          </Button>
            : !isOut ? <Button onClick={() => checkOutMut.mutate()} disabled={checkOutMut.isPending} variant="outline" className="w-full" size="sm">
            {checkOutMut.isPending ? <><span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />Checking Out...</> : <><LogOut className="h-4 w-4 mr-1" />Check Out</>}
          </Button>
            : <p className="text-xs text-muted-foreground">{dayjs(att.checkIn).format('h:mm A')} — {dayjs(att.checkOut).format('h:mm A')}</p>}
        </CardContent></Card></motion.div>

        <motion.div {...fadeUp} transition={{ duration: 0.15 }}>
          <Card className={cn(onLunch && 'ring-2 ring-amber-400 border-amber-400 bg-amber-50/50 dark:bg-amber-950/20')}>
            <CardContent className="p-5 text-center">
              <div className={cn('w-12 h-12 rounded-2xl mx-auto mb-2 flex items-center justify-center', onLunch ? 'bg-amber-500 animate-pulse' : 'bg-amber-100 dark:bg-amber-900/30')}>
                <Coffee className={cn('h-6 w-6', onLunch ? 'text-white' : 'text-amber-500')} />
              </div>
              <p className="text-sm text-muted-foreground mb-2">Lunch</p>
              {!isIn || isOut ? <Button disabled size="sm" variant="outline" className="w-full">N/A</Button>
                : !att?.lunchBreakStart ? <Button onClick={() => lunchMut.mutate('start')} disabled={lunchMut.isPending} size="sm" variant="outline" className="w-full">
                {lunchMut.isPending ? <><span className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-1.5" />Starting...</> : 'Start Lunch'}
              </Button>
                : !att?.lunchBreakEnd ? <Button onClick={() => lunchMut.mutate('end')} disabled={lunchMut.isPending} size="sm" className="w-full bg-amber-500 hover:bg-amber-600 text-white">
                {lunchMut.isPending ? <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />Ending...</> : 'End Lunch'}
              </Button>
                : <p className="text-xs text-muted-foreground">✓ Done</p>}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div {...fadeUp} transition={{ duration: 0.15 }}><Card><CardContent className="p-5 text-center">
          <Timer className="h-8 w-8 mx-auto mb-2 text-purple-500" /><p className="text-sm text-muted-foreground mb-1">Breaks</p><p className="text-lg font-bold">{att?.shortBreaks?.length || 0}</p>
        </CardContent></Card></motion.div>

        <motion.div {...fadeUp} transition={{ duration: 0.15 }}><Card><CardContent className="p-5 text-center">
          <Clock className="h-8 w-8 mx-auto mb-2 text-emerald-500" /><p className="text-sm text-muted-foreground mb-1">Hours</p><p className="text-2xl font-bold">{(att?.totalWorkingHours || 0).toFixed(1)}h</p>
        </CardContent></Card></motion.div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Attendance History</CardTitle>
            <div className="flex items-center gap-2">
              <select value={histMonth} onChange={e => setHistMonth(parseInt(e.target.value))} className="h-8 rounded-md border border-input bg-background text-foreground px-2 text-xs [&>option]:bg-background [&>option]:text-foreground">
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <option key={m} value={m}>{dayjs().month(m-1).format('MMMM')}</option>)}
              </select>
              <select value={histYear} onChange={e => setHistYear(parseInt(e.target.value))} className="h-8 rounded-md border border-input bg-background text-foreground px-2 text-xs [&>option]:bg-background [&>option]:text-foreground">
                {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {histLoading ? <p className="text-sm text-muted-foreground text-center py-6">Loading...</p> : !historyData?.attendance?.length ? <EmptyState title="No records" description={`No attendance for ${dayjs().month(histMonth-1).format('MMMM')} ${histYear}`} /> : (
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left">
              <th className="pb-2 font-medium">Date</th><th className="pb-2 font-medium">In</th><th className="pb-2 font-medium">Out</th><th className="pb-2 font-medium">Hours</th><th className="pb-2 font-medium">Status</th>
            </tr></thead><tbody>{historyData.attendance.map(a => (
              <tr key={a._id} className="border-b last:border-0"><td className="py-2">{dayjs(a.date).format('MMM D')}</td><td className="py-2">{a.checkIn ? dayjs(a.checkIn).format('h:mm A') : '—'}</td><td className="py-2">{a.checkOut ? dayjs(a.checkOut).format('h:mm A') : '—'}</td><td className="py-2">{(a.totalWorkingHours || 0).toFixed(1)}h</td><td className="py-2 flex items-center gap-1.5"><StatusBadge status={a.status} />{a.autoCheckout && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Auto</span>}{a.reportMissing && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">No Report</span>}{a.manualCheckout && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Manual</span>}</td></tr>
            ))}</tbody></table></div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AdminAttendance() {
  const qc = useQueryClient();
  const [empFilter, setEmpFilter] = useState('all');
  const [fromDate, setFromDate] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [toDate, setToDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [expandedEmp, setExpandedEmp] = useState(null);


  const { employees: allEmployees, allUsers } = useEmployeeList();

  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['att-analytics', empFilter, fromDate, toDate],
    queryFn: () => api.get('/attendance/analytics', { params: { employeeId: empFilter, from: fromDate, to: toDate } }).then(r => r.data),
    staleTime: 60000,
  });

  const { data: todayData } = useQuery({
    queryKey: ['attendance-today'],
    queryFn: () => api.get('/attendance/today').then(r => r.data),
    staleTime: 30000,
  });

  if (isLoading) return <PageSkeleton />;

  const employees = allEmployees;
  const empOpts = [{ value: 'all', label: 'All Employees' }, ...employees.map(e => ({ value: e._id, label: e.name }))];
  const reports = analyticsData?.employeeReports || [];
  const chart = analyticsData?.dailyPresenceChart || [];
  const summary = analyticsData?.summary || {};
  const allToday = todayData?.attendance || [];

  const attendancePie = reports.length > 0 ? [
    { name: 'Present', value: reports.reduce((s, r) => s + r.presentCount, 0), fill: '#22c55e' },
    { name: 'Absent', value: reports.reduce((s, r) => s + r.absentCount, 0), fill: '#ef4444' },
  ].filter(d => d.value > 0) : [];

  const statusColors = { present: 'bg-emerald-500', absent: 'bg-red-500', weekend: 'bg-slate-300 dark:bg-slate-700', holiday: 'bg-blue-400', future: 'bg-muted', leave: 'bg-orange-400' };

  return (
    <div className="space-y-6">
      <motion.div {...fadeUp}>
        <Card><CardContent className="p-4"><div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1"><Label className="text-xs mb-1 block">Employee</Label><SimpleSelect value={empFilter} onChange={setEmpFilter} options={empOpts} className="w-full" /></div>
          <div><Label className="text-xs mb-1 block">From</Label><Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="h-9" /></div>
          <div><Label className="text-xs mb-1 block">To</Label><Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="h-9" /></div>
        </div></CardContent></Card>
      </motion.div>

      <CheckoutRequests />

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {[{ icon: Users, label: 'Employees', value: summary.totalEmployees, color: 'bg-blue-500' },
          { icon: CalendarCheck, label: 'Working Days', value: summary.workingDays, color: 'bg-indigo-500' },
          { icon: TrendingUp, label: 'Avg Attendance', value: `${summary.avgAttendanceRate || 0}%`, color: 'bg-emerald-500' },
          { icon: CalendarX, label: 'Holidays', value: summary.holidays, color: 'bg-purple-500' },
        ].map((s, i) => (
          <motion.div key={s.label} {...fadeUp} transition={{ duration: 0.15 }}>
            <Card><CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center shrink-0`}><s.icon className="h-5 w-5 text-white" /></div>
              <div><p className="text-xl font-bold">{s.value}</p><p className="text-[11px] text-muted-foreground">{s.label}</p></div>
            </CardContent></Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {chart.length > 0 && <motion.div {...fadeUp}><Card><CardHeader><CardTitle className="text-base">Daily Trend</CardTitle></CardHeader><CardContent><div className="h-56">
          <ResponsiveContainer width="100%" height="100%"><BarChart data={chart}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="date" tick={{ fill: 'var(--color-muted-foreground)', fontSize: 10 }} /><YAxis tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }} />
            <Tooltip contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="present" fill="#22c55e" radius={[2, 2, 0, 0]} name="Present" stackId="a" /><Bar dataKey="absent" fill="#ef4444" radius={[2, 2, 0, 0]} name="Absent" stackId="a" /><Legend />
          </BarChart></ResponsiveContainer>
        </div></CardContent></Card></motion.div>}

        {attendancePie.length > 0 && <motion.div {...fadeUp}><Card><CardHeader><CardTitle className="text-base">Overall</CardTitle></CardHeader><CardContent><div className="h-56 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={attendancePie} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
            {attendancePie.map((e, i) => <Cell key={i} fill={e.fill} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer>
        </div></CardContent></Card></motion.div>}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Employee Reports</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {reports.map((r) => (
            <div key={r.employee._id} className="border rounded-lg overflow-hidden">
              <div className="p-4 flex items-center gap-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setExpandedEmp(expandedEmp === r.employee._id ? null : r.employee._id)}>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><span className="text-sm font-medium text-primary">{r.employee.name.charAt(0)}</span></div>
                <div className="flex-1 min-w-0"><p className="font-medium text-sm">{r.employee.name}</p><p className="text-xs text-muted-foreground">{r.employee.department}</p></div>
                <div className="hidden sm:flex gap-6 text-center">
                  <div><p className="text-lg font-bold text-emerald-600">{r.presentCount}</p><p className="text-[10px] text-muted-foreground">Present</p></div>
                  <div><p className="text-lg font-bold text-red-600">{r.absentCount}</p><p className="text-[10px] text-muted-foreground">Absent</p></div>
                  <div><p className="text-lg font-bold">{r.totalHours}h</p><p className="text-[10px] text-muted-foreground">Hours</p></div>
                  <div><p className={cn('text-lg font-bold', r.attendanceRate >= 80 ? 'text-emerald-600' : r.attendanceRate >= 60 ? 'text-amber-600' : 'text-red-600')}>{r.attendanceRate}%</p><p className="text-[10px] text-muted-foreground">Rate</p></div>
                </div>
                <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', expandedEmp === r.employee._id && 'rotate-180')} />
              </div>

              {expandedEmp === r.employee._id && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="border-t p-4 space-y-4">
                  <div className="grid grid-cols-4 gap-3 text-sm">
                    <div className="p-2 rounded-lg bg-muted/50"><p className="text-xs text-muted-foreground">Avg/Day</p><p className="font-semibold">{r.avgHoursPerDay}h</p></div>
                    <div className="p-2 rounded-lg bg-muted/50"><p className="text-xs text-muted-foreground">Break</p><p className="font-semibold">{r.totalBreakHours}h</p></div>
                    <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-950/20"><p className="text-xs text-muted-foreground">Leave</p><p className="font-semibold text-orange-600">{r.leaveCount || 0}</p></div>
                    <div className="p-2 rounded-lg bg-muted/50"><p className="text-xs text-muted-foreground">Late</p><p className="font-semibold">{r.lateCheckIns}</p></div>
                  </div>

                  {r.absentDays?.length > 0 && (<div><p className="text-xs font-semibold text-red-600 mb-2"><CalendarX className="h-3 w-3 inline mr-1" />Absent ({r.absentDays.length})</p>
                    <div className="flex flex-wrap gap-1.5">{r.absentDays.map(d => <span key={d.date} className="px-2 py-1 rounded-md text-xs bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-800">{d.day}</span>)}</div>
                  </div>)}

                  <div><p className="text-xs font-medium text-muted-foreground mb-2">Calendar</p>
                    <div className="flex flex-wrap gap-1">{r.dailyBreakdown?.map(d => (
                      <div key={d.date} className="group relative">
                        <div className={cn('w-7 h-7 rounded-md flex items-center justify-center text-[9px] font-medium', statusColors[d.status] || 'bg-muted',
                          ['present', 'absent', 'holiday', 'leave'].includes(d.status) && 'text-white',
                          ['weekend', 'future'].includes(d.status) && 'text-muted-foreground')}>{dayjs(d.date).format('D')}</div>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-popover border rounded-md text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10 shadow-md">
                          {d.fullDay} — {d.status === 'present' ? `✓ ${d.hours?.toFixed(1)}h` : d.status === 'holiday' ? `🎉 ${d.holidayName || 'Holiday'}` : d.status === 'leave' ? `🏖️ ${d.leaveType}` : d.status}
                        </div>
                      </div>
                    ))}</div>
                    <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500" />Present</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500" />Absent</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-400" />Leave</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-400" />Holiday</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-300 dark:bg-slate-700" />Weekend</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {allToday.length > 0 && <Card>
        <CardHeader><CardTitle className="text-base"><Users className="h-4 w-4 inline mr-1" />Today ({allToday.length})</CardTitle></CardHeader>
        <CardContent><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left">
          <th className="pb-2 font-medium">Name</th><th className="pb-2 font-medium">In</th><th className="pb-2 font-medium">Out</th><th className="pb-2 font-medium">Status</th>
        </tr></thead><tbody>{allToday.map(a => (
          <tr key={a._id} className="border-b last:border-0"><td className="py-2">{a.userId?.name}</td><td className="py-2">{a.checkIn ? dayjs(a.checkIn).format('h:mm A') : '—'}</td><td className="py-2">{a.checkOut ? dayjs(a.checkOut).format('h:mm A') : '—'}</td><td className="py-2 flex items-center gap-1.5"><StatusBadge status={a.status} />{a.autoCheckout && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Auto</span>}{a.reportMissing && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">No Report</span>}{a.manualCheckout && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Manual</span>}</td></tr>
        ))}</tbody></table></div></CardContent>
      </Card>}
    </div>
  );
}
