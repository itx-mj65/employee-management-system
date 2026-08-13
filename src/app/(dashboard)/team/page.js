'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Clock, CheckSquare, Timer, TrendingUp, Calendar,
  Award, AlertCircle, BarChart2, User, Activity, Star,
  ChevronRight, Briefcase, Coffee, FileText, Flag
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import api from '@/lib/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageSkeleton } from '@/components/shared/LoadingSkeleton';
import dayjs from 'dayjs';
import { cn } from '@/lib/utils';

const MONTH_OPTS = [1,2,3,4,5,6,7,8,9,10,11,12].map(m => ({ value: m, label: dayjs().month(m-1).format('MMMM') }));
const YEAR_OPTS = [2025, 2026, 2027].map(y => ({ value: y, label: String(y) }));

export default function TeamPage() {
  const { role } = useAuth();
  const [selected, setSelected] = useState(null);

  if (!['admin', 'manager', 'team-lead'].includes(role)) {
    return <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Access restricted to managers and team leads.</div>;
  }

  return (
    <AnimatePresence mode="wait">
      {selected ? (
        <MemberDetail key="detail" member={selected} onBack={() => setSelected(null)} />
      ) : (
        <TeamList key="list" onSelect={setSelected} role={role} />
      )}
    </AnimatePresence>
  );
}

// ── Team List ──────────────────────────────────────────────────────────────
function TeamList({ onSelect, role }) {
  const { data, isLoading } = useQuery({
    queryKey: ['team-members'],
    queryFn: () => api.get('/users').then(r => r.data),
    staleTime: 60000,
  });

  const members = (data?.users || []).filter(u => u.role !== 'admin');

  if (isLoading) return <PageSkeleton />;

  const byDept = members.reduce((acc, m) => {
    const d = m.department || 'Unassigned';
    if (!acc[d]) acc[d] = [];
    acc[d].push(m);
    return acc;
  }, {});

  const roleRank = { 'team-lead': 0, 'manager': 1, 'employee': 2 };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}
      className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold">Team</h2>
        <p className="text-sm text-muted-foreground">{members.length} members across {Object.keys(byDept).length} department{Object.keys(byDept).length !== 1 ? 's' : ''}</p>
      </div>

      {/* Department sections */}
      {Object.entries(byDept).map(([dept, deptMembers]) => (
        <div key={dept}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <h3 className="text-sm font-semibold">{dept}</h3>
            <span className="text-xs text-muted-foreground">{deptMembers.length} members</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...deptMembers].sort((a, b) => (roleRank[a.role] ?? 3) - (roleRank[b.role] ?? 3)).map((member, i) => (
              <motion.div key={member._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <MemberCard member={member} onClick={() => onSelect(member)} />
              </motion.div>
            ))}
          </div>
        </div>
      ))}
    </motion.div>
  );
}

function MemberCard({ member, onClick }) {
  const roleColors = {
    'team-lead': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    'manager': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    'employee': 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  };

  return (
    <Card className="group hover:shadow-md hover:border-primary/30 transition-all duration-200 cursor-pointer" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shrink-0">
            <span className="text-lg font-bold text-primary">{member.name?.charAt(0)?.toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{member.name}</p>
            <p className="text-xs text-muted-foreground truncate">{member.position || member.department}</p>
            <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize', roleColors[member.role] || roleColors.employee)}>
              {member.role?.replace('-', ' ')}
            </span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
        </div>
        {member.email && <p className="text-[10px] text-muted-foreground mt-2 truncate">{member.email}</p>}
      </CardContent>
    </Card>
  );
}

// ── Member Detail ──────────────────────────────────────────────────────────
function MemberDetail({ member, onBack }) {
  const [month, setMonth] = useState(dayjs().month() + 1);
  const [year, setYear] = useState(dayjs().year());
  const [activeTab, setActiveTab] = useState('overview');

  const m = String(month).padStart(2, '0');
  const fromDate = `${year}-${m}-01`;
  const toDate = dayjs(`${year}-${m}-01`).endOf('month').format('YYYY-MM-DD');

  const { data: attData } = useQuery({
    queryKey: ['member-attendance', member._id, month, year],
    queryFn: () => api.get('/attendance', { params: { employeeId: member._id, month, year } }).then(r => r.data),
  });

  const { data: taskData } = useQuery({
    queryKey: ['member-tasks', member._id],
    queryFn: () => api.get('/tasks', { params: { employeeId: member._id, limit: 100 } }).then(r => r.data),
  });

  const { data: reportData } = useQuery({
    queryKey: ['member-reports', member._id, month, year],
    queryFn: () => api.get('/reports', { params: { employeeId: member._id, page: 1, limit: 100 } }).then(r => r.data),
  });

  const { data: leaveData } = useQuery({
    queryKey: ['member-leaves', member._id],
    queryFn: () => api.get('/leaves', { params: { employeeId: member._id } }).then(r => r.data),
  });

  const att = attData?.attendance || [];
  const tasks = taskData?.tasks || [];
  const allReports = reportData?.reports || [];
  const reports = allReports.filter(r => {
    const d = dayjs(r.date);
    return d.month() + 1 === month && d.year() === year;
  });
  const leaves = leaveData?.leaves || [];

  // Compute stats
  const present = (att || []).filter(a => a.status === 'present').length;
  const totalHours = att.reduce((s, a) => s + (Number(a.totalWorkingHours) || 0), 0);
  const avgHours = present > 0 ? (totalHours / present).toFixed(1) : '0';
  const lateCount = (att || []).filter(a => {
    if (!a.checkIn) return false;
    const pkt = dayjs(a.checkIn).utcOffset(5);
    return pkt.hour() > 18 || (pkt.hour() === 18 && pkt.minute() >= 30);
  }).length;

  // Filter tasks by selected month client-side
  const monthStart = dayjs(`${year}-${String(month).padStart(2,'0')}-01`).startOf('month');
  const monthEnd = monthStart.endOf('month');
  const monthTasks = tasks.filter(t => {
    const d = dayjs(t.updatedAt || t.createdAt);
    return d.isAfter(monthStart.subtract(1, 'day')) && d.isBefore(monthEnd.add(1, 'day'));
  });
  const approvedTasks = monthTasks.filter(t => t.status === 'approved');
  const inProgressTasks = monthTasks.filter(t => t.status === 'accepted');
  const pendingTasks = monthTasks.filter(t => ['assigned', 'returned', 'submitted'].includes(t.status));
  const totalProductiveSec = (approvedTasks || []).reduce((s, t) => s + (Number(t.productiveSeconds) || 0), 0);
  const totalProductiveHours = (totalProductiveSec / 3600).toFixed(1);

  const attendanceRate = att.length > 0 ? Math.round((present / att.length) * 100) : 0;
  const taskCompletionRate = monthTasks.length > 0 ? Math.round((approvedTasks.length / monthTasks.length) * 100) : 0;

  // Performance score (40% attendance + 30% task completion + 30% hours)
  const perfScore = att.length === 0 ? 0 : Math.min(100, Math.round(
    (attendanceRate * 0.4) + (taskCompletionRate * 0.3) + (Math.min(totalHours / (att.length * 7) * 100, 100) * 0.3)
  ));

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'leaves', label: 'Leaves', icon: Calendar },
  ];

  const PRIORITY_COLORS = { urgent: 'text-red-500', high: 'text-orange-500', medium: 'text-blue-400', low: 'text-slate-400' };
  const STATUS_COLORS = {
    assigned: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    accepted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    submitted: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    returned: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.15 }}
      className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
            <span className="text-xl font-bold text-primary">{member.name?.charAt(0)?.toUpperCase()}</span>
          </div>
          <div>
            <h2 className="text-lg font-bold">{member.name}</h2>
            <p className="text-xs text-muted-foreground">{member.position || '—'} · {member.department} · <span className="capitalize">{member.role?.replace('-', ' ')}</span></p>
          </div>
        </div>
        {/* Month/Year filter */}
        <div className="flex items-center gap-2">
          <select value={month} onChange={e => setMonth(+e.target.value)}
            className="h-8 text-xs bg-background border border-input rounded-lg px-2 outline-none [&>option]:bg-background focus:border-primary">
            {MONTH_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={year} onChange={e => setYear(+e.target.value)}
            className="h-8 text-xs bg-background border border-input rounded-lg px-2 outline-none [&>option]:bg-background focus:border-primary">
            {YEAR_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Performance Score Banner */}
      <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="relative w-16 h-16">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/30" />
                  <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4"
                    strokeDasharray={`${2 * Math.PI * 28}`}
                    strokeDashoffset={`${2 * Math.PI * 28 * (1 - perfScore / 100)}`}
                    strokeLinecap="round"
                    className={perfScore >= 80 ? 'text-emerald-500' : perfScore >= 60 ? 'text-amber-500' : 'text-red-500'} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={cn('text-sm font-bold', perfScore >= 80 ? 'text-emerald-600' : perfScore >= 60 ? 'text-amber-600' : 'text-red-600')}>
                    {perfScore}%
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Performance</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
              {[
                { label: 'Days Present', value: present, icon: Activity, color: 'text-emerald-600' },
                { label: 'Approved Tasks', value: approvedTasks.length, icon: CheckSquare, color: 'text-blue-600' },
                { label: 'Productive Hrs', value: totalProductiveHours + 'h', icon: Timer, color: 'text-purple-600' },
                { label: 'Avg Hours/Day', value: avgHours + 'h', icon: Clock, color: 'text-amber-600' },
              ].map(s => (
                <div key={s.label}>
                  <p className={cn('text-xl font-bold', s.color)}>{s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-0.5 p-1 bg-muted/50 rounded-xl w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              activeTab === t.id ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}>
            <t.icon className="h-3.5 w-3.5" />{t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab === 'overview' && (
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Attendance summary */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4 text-primary" />Attendance — {dayjs().month(month-1).format('MMMM')}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Present', value: present, total: att.length, color: 'bg-emerald-500' },
                { label: 'Absent', value: att.length - present, total: att.length, color: 'bg-red-400' },
                { label: 'Late Check-ins', value: lateCount, total: present, color: 'bg-amber-400' },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-semibold">{item.value}{item.total ? `/${item.total}` : ''}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full transition-all', item.color)}
                      style={{ width: `${item.total ? Math.round(item.value / item.total * 100) : 0}%` }} />
                  </div>
                </div>
              ))}
              <div className="flex justify-between text-xs pt-1 border-t">
                <span className="text-muted-foreground">Total Hours</span>
                <span className="font-bold">{totalHours.toFixed(1)}h</span>
              </div>
            </CardContent>
          </Card>

          {/* Task summary */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><CheckSquare className="h-4 w-4 text-primary" />Tasks Overview</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: 'Approved', value: approvedTasks.length, color: 'text-emerald-600', dot: 'bg-emerald-500' },
                { label: 'In Progress', value: inProgressTasks.length, color: 'text-blue-600', dot: 'bg-blue-500' },
                { label: 'Pending', value: pendingTasks.length, color: 'text-amber-600', dot: 'bg-amber-500' },
                { label: 'Total', value: tasks.length, color: 'text-foreground', dot: 'bg-muted-foreground' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-1 border-b border-border/40 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className={cn('w-2 h-2 rounded-full', item.dot)} />
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                  </div>
                  <span className={cn('text-sm font-bold', item.color)}>{item.value}</span>
                </div>
              ))}
              <div className="pt-1">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Completion Rate</span>
                  <span className="font-semibold text-emerald-600">{taskCompletionRate}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${taskCompletionRate}%` }} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Productive time */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Timer className="h-4 w-4 text-purple-500" />Productive Time</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-600">{totalProductiveHours}h</p>
              <p className="text-xs text-muted-foreground mt-1">Across {approvedTasks.length} approved tasks</p>
              {approvedTasks.length > 0 && (
                <p className="text-xs text-muted-foreground">{((totalProductiveSec / approvedTasks.length) / 3600).toFixed(1)}h avg per task</p>
              )}
            </CardContent>
          </Card>

          {/* Recent activity */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4 text-primary" />Recent Activity</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {[...att].slice(0, 5).map(a => (
                <div key={a._id} className="flex items-center gap-2 text-xs py-1 border-b border-border/30 last:border-0">
                  <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', a.checkOut ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse')} />
                  <span className="text-muted-foreground w-16 shrink-0">{dayjs(a.date).format('ddd, MMM D')}</span>
                  <span className="text-emerald-600 font-mono">{a.checkIn ? dayjs(a.checkIn).format('h:mm A') : '—'}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-mono">{a.checkOut ? dayjs(a.checkOut).format('h:mm A') : <span className="text-amber-500">Active</span>}</span>
                  <span className="ml-auto font-semibold">{a.totalWorkingHours?.toFixed(1)}h</span>
                </div>
              ))}
              {att.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No attendance this month</p>}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── ATTENDANCE ── */}
      {activeTab === 'attendance' && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/30">
                  {['Date', 'Check In', 'Check Out', 'Hours', 'Breaks', 'Status'].map(h => (
                    <th key={h} className="p-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {att.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-muted-foreground text-xs">No attendance records for {dayjs().month(month-1).format('MMMM')} {year}</td></tr>
                  ) : att.map(a => (
                    <tr key={a._id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="p-3 font-medium text-xs">{dayjs(a.date).format('ddd, MMM D')}</td>
                      <td className="p-3 font-mono text-xs text-emerald-600">{a.checkIn ? dayjs(a.checkIn).format('h:mm A') : '—'}</td>
                      <td className="p-3 font-mono text-xs">{a.checkOut ? dayjs(a.checkOut).format('h:mm A') : <span className="text-amber-500">Active</span>}</td>
                      <td className="p-3 font-bold text-xs">{a.totalWorkingHours?.toFixed(1) || '—'}h</td>
                      <td className="p-3 text-xs text-muted-foreground">{a.shortBreaks?.length || 0} breaks</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold',
                            a.status === 'present' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700')}>
                            {a.status}
                          </span>
                          {a.autoCheckout && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700">Auto</span>}
                          {a.reportMissing && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-700">No Report</span>}
                          {a.manualCheckout && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700">Manual</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── TASKS ── */}
      {activeTab === 'tasks' && (
        <div className="space-y-2">
          {tasks.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-xs text-muted-foreground">No tasks assigned</CardContent></Card>
          ) : (monthTasks || []).map(task => {
            const hrs = ((task.productiveSeconds || 0) / 3600).toFixed(1);
            return (
              <Card key={task._id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium text-sm">{task.title}</span>
                        <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold', STATUS_COLORS[task.status] || STATUS_COLORS.assigned)}>
                          {task.status?.toUpperCase()}
                        </span>
                        <span className={cn('text-[10px] font-medium', PRIORITY_COLORS[task.priority])}>
                          {task.priority === 'urgent' ? '🚩' : task.priority === 'high' ? '⚠️' : task.priority === 'medium' ? '🔵' : '⬇️'} {task.priority}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
                        <span>Assigned by {task.assignedBy?.name || '—'}</span>
                        {task.deadline && <span>Due {dayjs(task.deadline).format('MMM D')}</span>}
                        <span className="text-purple-500 font-medium flex items-center gap-0.5">
                          <Timer className="h-3 w-3" />{hrs}h productive
                        </span>
                        <span>{dayjs(task.createdAt).format('MMM D, YYYY')}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── REPORTS ── */}
      {activeTab === 'reports' && (
        <div className="space-y-3">
          {!reports || reports.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-xs text-muted-foreground">No daily reports for {dayjs().month(month-1).format('MMMM')} {year}</CardContent></Card>
          ) : (
            <>
              {/* Summary bar */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Reports Submitted', value: reports.length, color: 'text-primary' },
                  { label: 'With Feedback', value: reports.filter(r => r.feedback).length, color: 'text-emerald-600' },
                  { label: 'This Month', value: reports.filter(r => dayjs(r.date).month() + 1 === month && dayjs(r.date).year() === year).length, color: 'text-blue-600' },
                ].map(s => (
                  <Card key={s.label}><CardContent className="p-3 text-center">
                    <p className={cn('text-xl font-bold', s.color)}>{s.value}</p>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  </CardContent></Card>
                ))}
              </div>

              {/* Reports list */}
              {reports.map(r => (
                <Card key={r._id} className="overflow-hidden">
                  {/* Date header strip */}
                  <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40 border-b">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-semibold">{dayjs(r.date).format('dddd, MMMM D YYYY')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.feedback && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-medium">✓ Feedback</span>}
                      <span className="text-[10px] text-muted-foreground">Submitted {dayjs(r.createdAt).format('h:mm A')}</span>
                    </div>
                  </div>

                  <CardContent className="p-0">
                    <div className="divide-y divide-border/40">
                      {/* Tasks Completed */}
                      <div className="flex gap-3 p-4">
                        <div className="w-1.5 rounded-full bg-primary shrink-0 my-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1">Tasks Completed</p>
                          <p className="text-sm leading-relaxed">{r.tasksCompleted}</p>
                        </div>
                      </div>

                      {/* Plan for Tomorrow */}
                      {r.planTomorrow && (
                        <div className="flex gap-3 p-4">
                          <div className="w-1.5 rounded-full bg-blue-400 shrink-0 my-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1">Plan for Tomorrow</p>
                            <p className="text-sm leading-relaxed text-muted-foreground">{r.planTomorrow}</p>
                          </div>
                        </div>
                      )}

                      {/* Remarks */}
                      {r.remarks && (
                        <div className="flex gap-3 p-4">
                          <div className="w-1.5 rounded-full bg-amber-400 shrink-0 my-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1">Remarks</p>
                            <p className="text-sm leading-relaxed text-muted-foreground">{r.remarks}</p>
                          </div>
                        </div>
                      )}

                      {/* Feedback */}
                      {r.feedback ? (
                        <div className="flex gap-3 p-4 bg-emerald-50/50 dark:bg-emerald-950/10">
                          <div className="w-1.5 rounded-full bg-emerald-500 shrink-0 my-0.5" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Feedback</p>
                              <span className="text-[10px] text-muted-foreground">by {r.feedbackBy?.name} · {r.feedbackAt ? dayjs(r.feedbackAt).format('MMM D, h:mm A') : ''}</span>
                            </div>
                            <p className="text-sm leading-relaxed text-emerald-800 dark:text-emerald-300">{r.feedback}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="px-4 py-2.5 text-[10px] text-muted-foreground/50 italic">No feedback given</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>
      )}

      {/* ── LEAVES ── */}
      {activeTab === 'leaves' && (
        <div className="space-y-2">
          {leaves.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-xs text-muted-foreground">No leave requests</CardContent></Card>
          ) : (leaves || []).map(l => (
            <Card key={l._id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn('p-2 rounded-xl', l.status === 'approved' ? 'bg-emerald-100 dark:bg-emerald-900/30' : l.status === 'rejected' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-amber-100 dark:bg-amber-900/30')}>
                    <Calendar className={cn('h-4 w-4', l.status === 'approved' ? 'text-emerald-600' : l.status === 'rejected' ? 'text-red-600' : 'text-amber-600')} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium capitalize">{l.type} Leave</span>
                      <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                        l.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : l.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700')}>
                        {l.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{dayjs(l.startDate).format('MMM D')} — {dayjs(l.endDate).format('MMM D, YYYY')} · {l.totalDays} day{l.totalDays !== 1 ? 's' : ''}</p>
                    {l.reason && <p className="text-xs text-muted-foreground mt-0.5">"{l.reason}"</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
}
