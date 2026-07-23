'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Users, UserCheck, UserX, Coffee, ClipboardCheck,
  CheckCircle2, Clock, ListTodo, Megaphone
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import api from '@/lib/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageSkeleton } from '@/components/shared/LoadingSkeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import dayjs from 'dayjs';

const fadeUp = { initial: { opacity: 0, y: 15 }, animate: { opacity: 1, y: 0 } };

function StatCard({ icon: Icon, label, value, color, delay = 0 }) {
  return (
    <motion.div {...fadeUp} transition={{ delay: delay * 0.08 }}>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">{label}</p>
              <p className="text-2xl font-bold">{value}</p>
            </div>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { isAdmin } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then(r => r.data),
  });

  if (isLoading) return <PageSkeleton />;

  if (isAdmin) return <AdminDashboard data={data} />;
  return <EmployeeDashboard data={data} />;
}

function AdminDashboard({ data }) {
  const { stats, weeklyStats } = data;

  const chartData = weeklyStats
    ? Object.entries(weeklyStats).map(([day, val]) => ({ day, ...val }))
    : [];

  const pieData = [
    { name: 'Present', value: stats.presentEmployees, fill: '#22c55e' },
    { name: 'Absent', value: stats.absentEmployees, fill: '#ef4444' },
    { name: 'On Break', value: stats.onBreakCount, fill: '#f59e0b' },
  ].filter(d => d.value > 0);

  const adminStats = [
    { icon: Users, label: 'Total Employees', value: stats.totalEmployees, color: 'bg-blue-500' },
    { icon: UserCheck, label: 'Present Today', value: stats.presentEmployees, color: 'bg-emerald-500' },
    { icon: UserX, label: 'Absent Today', value: stats.absentEmployees, color: 'bg-red-500' },
    { icon: Coffee, label: 'On Break', value: stats.onBreakCount, color: 'bg-amber-500' },
    { icon: ClipboardCheck, label: 'Pending Approvals', value: stats.pendingApprovals, color: 'bg-purple-500' },
    { icon: CheckCircle2, label: 'Completed Today', value: stats.completedTasks, color: 'bg-teal-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {adminStats.map((s, i) => (
          <StatCard key={s.label} {...s} delay={i} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Weekly Task Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="day" className="text-xs" tick={{ fill: 'var(--color-muted-foreground)' }} />
                    <YAxis className="text-xs" tick={{ fill: 'var(--color-muted-foreground)' }} />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--color-card)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="completed" fill="#22c55e" radius={[4, 4, 0, 0]} name="Completed" />
                    <Bar dataKey="pending" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Pending" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div {...fadeUp} transition={{ delay: 0.3 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Today&apos;s Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-muted-foreground text-sm">No attendance data today</p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

function EmployeeDashboard({ data }) {
  const { stats, attendance, recentAnnouncements } = data;

  const empStats = [
    { icon: ListTodo, label: 'Total Tasks', value: stats.totalTasks, color: 'bg-blue-500' },
    { icon: Clock, label: 'Pending', value: stats.pendingTasks, color: 'bg-amber-500' },
    { icon: CheckCircle2, label: 'Completed', value: stats.completedTasks, color: 'bg-emerald-500' },
    { icon: Clock, label: 'Working Hours', value: `${stats.workingHours?.toFixed(1) || 0}h`, color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {empStats.map((s, i) => (
          <StatCard key={s.label} {...s} delay={i} />
        ))}
      </div>

      {/* Status card */}
      <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today&apos;s Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${stats.isCheckedIn ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                <span>{stats.isCheckedIn ? 'Checked In' : 'Not Checked In'}</span>
              </div>
              {attendance?.checkIn && (
                <span className="text-muted-foreground">
                  Check-in: {dayjs(attendance.checkIn).format('hh:mm A')}
                </span>
              )}
              {attendance?.checkOut && (
                <span className="text-muted-foreground">
                  Check-out: {dayjs(attendance.checkOut).format('hh:mm A')}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent announcements */}
      {recentAnnouncements?.length > 0 && (
        <motion.div {...fadeUp} transition={{ delay: 0.3 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Megaphone className="h-4 w-4" /> Recent Announcements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentAnnouncements.map((a) => (
                <div key={a._id} className="p-3 rounded-lg bg-muted/50 border">
                  <p className="font-medium text-sm">{a.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">{dayjs(a.createdAt).format('MMM D, YYYY')}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
