'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { TrendingUp, CheckCircle2, Clock, AlertTriangle, XCircle, Timer, CalendarCheck, Target } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import api from '@/lib/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageSkeleton } from '@/components/shared/LoadingSkeleton';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import dayjs from 'dayjs';
import { cn } from '@/lib/utils';

const fadeUp = { initial: { opacity: 0, y: 15 }, animate: { opacity: 1, y: 0 } };
const months = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: dayjs().month(i).format('MMMM') }));

function SimpleSelect({ value, onChange, options, className }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className={cn('flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring', className)}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function ScoreRing({ score, size = 120 }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="var(--color-muted)" strokeWidth="8" fill="none" />
        <motion.circle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth="8" fill="none"
          strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold">{score}</span>
        <span className="text-[10px] text-muted-foreground">Score</span>
      </div>
    </div>
  );
}

export default function PerformancePage() {
  const { isAdmin } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(String(dayjs().month() + 1));
  const [selectedYear] = useState(String(dayjs().year()));

  const { data, isLoading } = useQuery({
    queryKey: ['performance', selectedMonth, selectedYear],
    queryFn: () => api.get('/performance', { params: { month: selectedMonth, year: selectedYear } }).then(r => r.data),
    enabled: !isAdmin,
  });

  if (isAdmin) return <AdminPerformance />;
  if (isLoading) return <PageSkeleton />;
  if (!data?.stats) return <p className="text-muted-foreground">No data</p>;

  const { stats, employee } = data;

  const taskPie = [
    { name: 'Completed', value: stats.completedTasks, fill: '#22c55e' },
    { name: 'Pending', value: stats.pendingTasks, fill: '#f59e0b' },
    { name: 'Rejected', value: stats.rejectedTasks, fill: '#ef4444' },
  ].filter(d => d.value > 0);

  const deliveryPie = [
    { name: 'On Time', value: stats.onTimeTasks, fill: '#22c55e' },
    { name: 'Late', value: stats.lateTasks, fill: '#ef4444' },
  ].filter(d => d.value > 0);

  const statCards = [
    { icon: Target, label: 'Total Tasks', value: stats.totalTasks, color: 'bg-blue-500' },
    { icon: CheckCircle2, label: 'Completed', value: stats.completedTasks, color: 'bg-emerald-500' },
    { icon: Clock, label: 'Pending', value: stats.pendingTasks, color: 'bg-amber-500' },
    { icon: XCircle, label: 'Rejected', value: stats.rejectedTasks, color: 'bg-red-500' },
    { icon: Timer, label: 'On Time', value: stats.onTimeTasks, color: 'bg-teal-500' },
    { icon: AlertTriangle, label: 'Late', value: stats.lateTasks, color: 'bg-orange-500' },
    { icon: CalendarCheck, label: 'Present Days', value: stats.presentDays, color: 'bg-indigo-500' },
    { icon: TrendingUp, label: 'Avg Hours/Day', value: `${stats.avgHoursPerDay}h`, color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">My Performance</h2>
          <p className="text-sm text-muted-foreground">{employee?.name} — {employee?.department}</p>
        </div>
        <SimpleSelect value={selectedMonth} onChange={setSelectedMonth} options={months} className="w-36" />
      </div>

      {/* Score + Stats */}
      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div {...fadeUp} className="lg:col-span-1">
          <Card className="h-full">
            <CardContent className="p-6 flex flex-col items-center justify-center">
              <ScoreRing score={stats.performanceScore} size={140} />
              <p className="text-sm font-medium mt-3">Performance Score</p>
              <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                <span>Completion: {stats.completionRate}%</span>
                <span>On-time: {stats.onTimeRate}%</span>
              </div>
              <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                <span>Attendance: {stats.attendancePercentage}%</span>
              </div>
              {stats.overdueTasks > 0 && (
                <div className="mt-3 px-3 py-1.5 rounded-md bg-red-50 dark:bg-red-950/30 text-xs text-red-600 font-medium flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> {stats.overdueTasks} overdue
                </div>
              )}
              {stats.remarks && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg text-xs text-center w-full">
                  <p className="font-medium mb-1">Admin Remarks</p>
                  <p className="text-muted-foreground">{stats.remarks}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="lg:col-span-2">
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            {statCards.map((s, i) => (
              <Card key={s.label}>
                <CardContent className="p-4">
                  <div className={`w-9 h-9 rounded-lg ${s.color} flex items-center justify-center mb-2`}>
                    <s.icon className="h-4 w-4 text-white" />
                  </div>
                  <p className="text-xl font-bold">{s.value}</p>
                  <p className="text-[11px] text-muted-foreground">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader><CardTitle className="text-base">Task Breakdown</CardTitle></CardHeader>
            <CardContent>
              <div className="h-56 flex items-center justify-center">
                {taskPie.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart><Pie data={taskPie} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {taskPie.map((e, i) => <Cell key={i} fill={e.fill} />)}
                    </Pie><Tooltip /></PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-muted-foreground">No tasks this month</p>}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div {...fadeUp} transition={{ delay: 0.3 }}>
          <Card>
            <CardHeader><CardTitle className="text-base">Delivery Performance</CardTitle></CardHeader>
            <CardContent>
              <div className="h-56 flex items-center justify-center">
                {deliveryPie.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart><Pie data={deliveryPie} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {deliveryPie.map((e, i) => <Cell key={i} fill={e.fill} />)}
                    </Pie><Tooltip /></PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-muted-foreground">No delivery data</p>}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

// ===================== ADMIN PERFORMANCE =====================
function AdminPerformance() {
  const [selectedMonth, setSelectedMonth] = useState(String(dayjs().month() + 1));
  const [selectedYear] = useState(String(dayjs().year()));
  const [selectedEmployee, setSelectedEmployee] = useState('all');

  const { data: usersData } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => api.get('/users').then(r => r.data),
  });

  const employees = usersData?.users?.filter(u => u.role === 'employee') || [];
  const employeeOptions = [{ value: 'all', label: 'All Employees' }, ...employees.map(e => ({ value: e._id, label: e.name }))];

  const { data, isLoading } = useQuery({
    queryKey: ['performance-admin', selectedMonth, selectedYear, selectedEmployee],
    queryFn: () => api.get('/performance', { params: { month: selectedMonth, year: selectedYear, employeeId: selectedEmployee } }).then(r => r.data),
  });

  if (isLoading) return <PageSkeleton />;

  // Single employee view
  if (selectedEmployee !== 'all' && data?.stats) {
    const { stats, employee } = data;
    const taskPie = [
      { name: 'Completed', value: stats.completedTasks, fill: '#22c55e' },
      { name: 'Pending', value: stats.pendingTasks, fill: '#f59e0b' },
      { name: 'Rejected', value: stats.rejectedTasks, fill: '#ef4444' },
    ].filter(d => d.value > 0);

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">Performance Overview</h2>
          <div className="flex gap-3">
            <SimpleSelect value={selectedEmployee} onChange={setSelectedEmployee} options={employeeOptions} className="w-48" />
            <SimpleSelect value={selectedMonth} onChange={setSelectedMonth} options={months} className="w-36" />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <motion.div {...fadeUp}>
            <Card className="h-full">
              <CardContent className="p-6 flex flex-col items-center justify-center">
                <ScoreRing score={stats.performanceScore} size={130} />
                <p className="font-semibold mt-3">{employee?.name}</p>
                <p className="text-xs text-muted-foreground">{employee?.department} — {employee?.position}</p>
                <div className="grid grid-cols-3 gap-3 mt-4 w-full text-center">
                  <div><p className="text-lg font-bold text-emerald-600">{stats.completionRate}%</p><p className="text-[10px] text-muted-foreground">Completion</p></div>
                  <div><p className="text-lg font-bold text-blue-600">{stats.onTimeRate}%</p><p className="text-[10px] text-muted-foreground">On-Time</p></div>
                  <div><p className="text-lg font-bold text-purple-600">{stats.attendancePercentage}%</p><p className="text-[10px] text-muted-foreground">Attendance</p></div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total', value: stats.totalTasks, color: 'text-blue-600' },
              { label: 'Completed', value: stats.completedTasks, color: 'text-emerald-600' },
              { label: 'Pending', value: stats.pendingTasks, color: 'text-amber-600' },
              { label: 'Rejected', value: stats.rejectedTasks, color: 'text-red-600' },
              { label: 'On Time', value: stats.onTimeTasks, color: 'text-teal-600' },
              { label: 'Late', value: stats.lateTasks, color: 'text-orange-600' },
              { label: 'Overdue', value: stats.overdueTasks, color: 'text-red-700' },
              { label: 'Work Hours', value: `${stats.totalWorkingHours}h`, color: 'text-purple-600' },
            ].map(s => (
              <Card key={s.label}><CardContent className="p-4"><p className={`text-xl font-bold ${s.color}`}>{s.value}</p><p className="text-[11px] text-muted-foreground">{s.label}</p></CardContent></Card>
            ))}
          </motion.div>
        </div>

        <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader><CardTitle className="text-base">Task Distribution</CardTitle></CardHeader>
            <CardContent>
              <div className="h-56 flex items-center justify-center">
                {taskPie.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart><Pie data={taskPie} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {taskPie.map((e, i) => <Cell key={i} fill={e.fill} />)}
                    </Pie><Tooltip /></PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-muted-foreground">No data</p>}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // All employees overview
  const allData = data?.employees || [];
  const totals = data?.totals || {};

  const barData = allData.map(e => ({
    name: e.employee.name.split(' ')[0],
    score: e.stats.performanceScore,
    completed: e.stats.completedTasks,
    pending: e.stats.pendingTasks,
    attendance: e.stats.attendancePercentage,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">Team Performance</h2>
        <div className="flex gap-3">
          <SimpleSelect value={selectedEmployee} onChange={setSelectedEmployee} options={employeeOptions} className="w-48" />
          <SimpleSelect value={selectedMonth} onChange={setSelectedMonth} options={months} className="w-36" />
        </div>
      </div>

      {/* Team totals */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
        {[
          { label: 'Total Tasks', value: totals.totalTasks, color: 'text-blue-600' },
          { label: 'Completed', value: totals.completedTasks, color: 'text-emerald-600' },
          { label: 'Pending', value: totals.pendingTasks, color: 'text-amber-600' },
          { label: 'Avg Attendance', value: `${totals.avgAttendance}%`, color: 'text-purple-600' },
          { label: 'Avg Score', value: totals.avgScore, color: 'text-primary' },
        ].map(s => (
          <motion.div key={s.label} {...fadeUp}>
            <Card><CardContent className="p-4"><p className={`text-2xl font-bold ${s.color}`}>{s.value}</p><p className="text-[11px] text-muted-foreground">{s.label}</p></CardContent></Card>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader><CardTitle className="text-base">Performance Scores</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }} />
                    <YAxis tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }} domain={[0, 100]} />
                    <Tooltip contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="score" fill="#6366f1" radius={[4, 4, 0, 0]} name="Score" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader><CardTitle className="text-base">Tasks by Employee</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }} />
                    <YAxis tick={{ fill: 'var(--color-muted-foreground)', fontSize: 12 }} />
                    <Tooltip contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="completed" fill="#22c55e" radius={[4, 4, 0, 0]} name="Completed" />
                    <Bar dataKey="pending" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Pending" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Employee leaderboard */}
      <motion.div {...fadeUp} transition={{ delay: 0.3 }}>
        <Card>
          <CardHeader><CardTitle className="text-base">Employee Leaderboard</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {allData.map((e, i) => (
                <div key={e.employee._id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedEmployee(e.employee._id)}>
                  <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white',
                    i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-amber-700' : 'bg-muted text-muted-foreground'
                  )}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{e.employee.name}</p>
                    <p className="text-xs text-muted-foreground">{e.employee.department || e.employee.position}</p>
                  </div>
                  <div className="text-right">
                    <p className={cn('text-lg font-bold', e.stats.performanceScore >= 80 ? 'text-emerald-600' : e.stats.performanceScore >= 60 ? 'text-amber-600' : 'text-red-600')}>
                      {e.stats.performanceScore}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{e.stats.completedTasks}/{e.stats.totalTasks} tasks</p>
                  </div>
                  <div className="hidden sm:flex gap-3 text-xs text-muted-foreground">
                    <span>{e.stats.attendancePercentage}% att</span>
                    <span>{e.stats.onTimeRate}% on-time</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
