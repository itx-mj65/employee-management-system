'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Coffee, Timer, AlertTriangle, Clock, Users, ChevronLeft, ChevronRight, Utensils } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { PageSkeleton } from '@/components/shared/LoadingSkeleton';
import EmptyState from '@/components/shared/EmptyState';
import dayjs from 'dayjs';
import { cn } from '@/lib/utils';

const fadeUp = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } };

function SimpleSelect({ value, onChange, options, className }) {
  return (<select value={value} onChange={e => onChange(e.target.value)} className={cn('flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring', className)}>
    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>);
}

export default function BreaksPage() {
  const { isAdmin, role } = useAuth();
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [deptFilter, setDeptFilter] = useState('all');
  const [empFilter, setEmpFilter] = useState('all');

  const isToday = date === dayjs().format('YYYY-MM-DD');

  const { data, isLoading } = useQuery({
    queryKey: ['break-report', date, deptFilter, empFilter],
    queryFn: () => api.get('/breaks', { params: { date, department: deptFilter, employeeId: empFilter } }).then(r => r.data),
    refetchInterval: isToday ? 30000 : false,
  });

  const { data: deptsData } = useQuery({
    queryKey: ['departments'],
    queryFn: () => api.get('/departments').then(r => r.data),
    enabled: isAdmin || role === 'manager',
  });

  const { data: usersData } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => api.get('/users').then(r => r.data),
  });

  if (isLoading) return <PageSkeleton />;

  const breaks = data?.breaks || [];
  const active = data?.activeBreaks || [];
  const lateNow = data?.lateActive || [];
  const stats = data?.stats || {};

  const departments = deptsData?.departments || [];
  const employees = usersData?.users?.filter(u => u.role !== 'admin') || [];
  const filteredEmps = deptFilter !== 'all' ? employees.filter(e => e.department === deptFilter) : employees;

  const deptOpts = [{ value: 'all', label: 'All Departments' }, ...departments.map(d => ({ value: d.name, label: d.name }))];
  const empOpts = [{ value: 'all', label: 'All Employees' }, ...filteredEmps.map(e => ({ value: e._id, label: e.name }))];

  const prevDay = () => setDate(dayjs(date).subtract(1, 'day').format('YYYY-MM-DD'));
  const nextDay = () => { if (!isToday) setDate(dayjs(date).add(1, 'day').format('YYYY-MM-DD')); };

  return (
    <div className="space-y-5">
      {/* Live banner for late breaks */}
      {isToday && lateNow.length > 0 && (
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <Card className="border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center animate-pulse"><AlertTriangle className="h-5 w-5 text-white" /></div>
                <div><p className="font-semibold text-sm text-red-700 dark:text-red-400">⚠️ Break Time Exceeded</p><p className="text-xs text-red-600 dark:text-red-300">{lateNow.length} employee{lateNow.length > 1 ? 's' : ''} exceeded break limit</p></div>
              </div>
              <div className="space-y-1.5">
                {lateNow.map(b => (
                  <div key={b._id} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/60 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center"><span className="text-xs font-bold text-red-600">{b.name.charAt(0)}</span></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-800 dark:text-red-300">{b.name} <span className="text-xs font-normal text-red-600">({b.department})</span></p>
                      <p className="text-[11px] text-red-600 dark:text-red-400">Started {dayjs(b.start).format('h:mm A')} · {b.duration} min ({b.exceeded} min over {b.maxMins} limit)</p>
                    </div>
                    <span className="px-2 py-1 rounded-md text-xs font-bold bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200 animate-pulse">+{b.exceeded} min</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Active breaks banner */}
      {isToday && active.length > 0 && lateNow.length === 0 && (
        <motion.div {...fadeUp}>
          <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center"><Coffee className="h-5 w-5 text-white" /></div>
                <div><p className="font-semibold text-sm">Currently On Break</p><p className="text-xs text-muted-foreground">{active.length} employee{active.length > 1 ? 's' : ''}</p></div>
              </div>
              <div className="flex flex-wrap gap-2">
                {active.map(b => (
                  <div key={b._id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-card border text-sm">
                    <div className={cn('w-2 h-2 rounded-full', b.type === 'lunch' ? 'bg-blue-500' : 'bg-amber-500 animate-pulse')} />
                    <span className="font-medium">{b.name}</span>
                    <span className="text-xs text-muted-foreground">{b.department}</span>
                    <span className="text-xs text-muted-foreground">· {b.type === 'lunch' ? '🍽️' : '☕'} {b.duration}m</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Filters */}
      <Card><CardContent className="p-4"><div className="flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={prevDay}><ChevronLeft className="h-4 w-4" /></Button>
          <div><Label className="text-xs mb-1 block">Date</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} max={dayjs().format('YYYY-MM-DD')} className="h-9 w-40" /></div>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={nextDay} disabled={isToday}><ChevronRight className="h-4 w-4" /></Button>
        </div>
        {(isAdmin || role === 'manager') && <div><Label className="text-xs mb-1 block">Department</Label><SimpleSelect value={deptFilter} onChange={v => { setDeptFilter(v); setEmpFilter('all'); }} options={deptOpts} className="w-40" /></div>}
        <div><Label className="text-xs mb-1 block">Employee</Label><SimpleSelect value={empFilter} onChange={setEmpFilter} options={empOpts} className="w-40" /></div>
        {isToday && <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />Live</span>}
      </div></CardContent></Card>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
        {[
          { icon: Coffee, label: 'Total Breaks', value: stats.total, color: 'text-primary' },
          { icon: Timer, label: 'Short Breaks', value: stats.totalShort, color: 'text-amber-500' },
          { icon: Utensils, label: 'Lunch Breaks', value: stats.totalLunch, color: 'text-blue-500' },
          { icon: Users, label: 'Active Now', value: stats.active, color: 'text-emerald-500', highlight: isToday && stats.active > 0 },
          { icon: AlertTriangle, label: 'Late/Exceeded', value: stats.late, color: 'text-red-500', highlight: stats.late > 0 },
        ].map((s, i) => (
          <motion.div key={s.label} {...fadeUp} transition={{ delay: i * 0.04 }}>
            <Card className={cn(s.highlight && 'border-amber-300 dark:border-amber-700')}>
              <CardContent className="p-4 flex items-center gap-3">
                <s.icon className={cn('h-5 w-5', s.color)} />
                <div><p className={cn('text-xl font-bold', s.color)}>{s.value || 0}</p><p className="text-[10px] text-muted-foreground">{s.label}</p></div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Break log */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" />Break Log — {dayjs(date).format('ddd, MMM D YYYY')}{isToday && ' (Today)'}</CardTitle></CardHeader>
        <CardContent>
          {breaks.length === 0 ? (
            <EmptyState icon={Coffee} title="No breaks recorded" description={`No breaks on ${dayjs(date).format('MMM D')}`} />
          ) : (
            <div className="space-y-2">
              {breaks.map((b, i) => (
                <motion.div key={b._id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                  <div className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border transition-all',
                    b.isActive && b.isLate && 'border-red-300 bg-red-50/50 dark:border-red-800 dark:bg-red-950/10',
                    b.isActive && !b.isLate && 'border-amber-200 bg-amber-50/30 dark:border-amber-800 dark:bg-amber-950/10',
                    !b.isActive && b.isLate && 'border-red-200 dark:border-red-900',
                    !b.isActive && !b.isLate && 'border-border',
                  )}>
                    <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                      b.type === 'lunch' ? 'bg-blue-100 dark:bg-blue-900/30' : b.isLate ? 'bg-red-100 dark:bg-red-900/30' : 'bg-amber-100 dark:bg-amber-900/30',
                      b.isActive && 'animate-pulse'
                    )}>
                      {b.type === 'lunch' ? <Utensils className="h-4 w-4 text-blue-600" /> : <Coffee className={cn('h-4 w-4', b.isLate ? 'text-red-600' : 'text-amber-600')} />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-sm">{b.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{b.department}</span>
                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium',
                          b.type === 'lunch' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                        )}>{b.type === 'lunch' ? 'Lunch' : 'Short'}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {dayjs(b.start).format('h:mm A')} {b.end ? `→ ${dayjs(b.end).format('h:mm A')}` : '→ ongoing'} · <span className={cn('font-medium', b.isLate ? 'text-red-600' : '')}>{b.duration} min</span>
                        {b.type === 'short' && <span className="text-muted-foreground/60"> / {b.maxMins} max</span>}
                      </div>
                    </div>

                    {b.isActive && !b.isLate && <span className="px-2 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">Active</span>}
                    {b.isActive && b.isLate && <span className="px-2 py-1 rounded-md text-xs font-bold bg-red-200 text-red-700 dark:bg-red-800 dark:text-red-200 animate-pulse">+{b.exceeded}m late</span>}
                    {!b.isActive && b.isLate && <span className="px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">+{b.exceeded}m</span>}
                    {!b.isActive && !b.isLate && <span className="px-2 py-1 rounded-md text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20">✓ {b.duration}m</span>}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
