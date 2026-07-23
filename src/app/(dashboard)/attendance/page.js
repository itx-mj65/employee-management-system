'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { LogIn, LogOut, Coffee, Timer, Clock, AlertTriangle, Users } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import StatusBadge from '@/components/shared/StatusBadge';
import EmptyState from '@/components/shared/EmptyState';
import { PageSkeleton } from '@/components/shared/LoadingSkeleton';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { cn } from '@/lib/utils';

const fadeUp = { initial: { opacity: 0, y: 15 }, animate: { opacity: 1, y: 0 } };

export default function AttendancePage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(String(dayjs().month() + 1));
  const [selectedYear] = useState(String(dayjs().year()));

  const { data: todayData, isLoading: todayLoading } = useQuery({
    queryKey: ['attendance-today'],
    queryFn: () => api.get('/attendance/today').then(r => r.data),
  });

  const { data: breakData } = useQuery({
    queryKey: ['break-status'],
    queryFn: () => api.get('/attendance/break').then(r => r.data),
    refetchInterval: 5000,
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['attendance-history', selectedMonth, selectedYear],
    queryFn: () => api.get('/attendance', { params: { month: selectedMonth, year: selectedYear } }).then(r => r.data),
  });

  const checkInMutation = useMutation({
    mutationFn: () => api.post('/attendance/check-in'),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['attendance-today'] }); queryClient.invalidateQueries({ queryKey: ['dashboard'] }); toast.success('Checked in!'); },
  });

  const checkOutMutation = useMutation({
    mutationFn: () => api.put('/attendance/check-out'),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['attendance-today'] }); queryClient.invalidateQueries({ queryKey: ['dashboard'] }); toast.success('Checked out!'); },
  });

  const lunchMutation = useMutation({
    mutationFn: (action) => api.put('/attendance/lunch', { action }),
    onSuccess: (_, action) => { queryClient.invalidateQueries({ queryKey: ['attendance-today'] }); toast.success(`Lunch break ${action}ed`); },
  });

  const breakMutation = useMutation({
    mutationFn: (action) => api.put('/attendance/break', { action }),
    onSuccess: (_, action) => {
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
      queryClient.invalidateQueries({ queryKey: ['break-status'] });
      toast.success(`Short break ${action}ed`);
    },
    onError: (err) => { toast.error(err.response?.data?.error || 'Break error'); },
  });

  if (todayLoading) return <PageSkeleton />;

  const attendance = isAdmin ? null : todayData?.attendance;
  const allToday = isAdmin ? (todayData?.attendance || []) : [];
  const isCheckedIn = !!attendance?.checkIn;
  const isCheckedOut = !!attendance?.checkOut;
  const lastBreak = attendance?.shortBreaks?.[attendance.shortBreaks.length - 1];
  const isOnShortBreak = lastBreak && lastBreak.start && !lastBreak.end;
  const breakAvailable = breakData?.isAvailable;
  const breakOccupant = breakData?.onBreak;

  return (
    <div className="space-y-6">
      {/* Break Queue Status Banner */}
      {!isAdmin && isCheckedIn && !isCheckedOut && (
        <motion.div {...fadeUp}>
          <Card className={breakAvailable ? 'border-emerald-200 dark:border-emerald-800' : 'border-amber-200 dark:border-amber-800'}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${breakAvailable ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
                <Timer className={`h-5 w-5 ${breakAvailable ? 'text-emerald-600' : 'text-amber-600'}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {isOnShortBreak
                    ? 'You are on a short break'
                    : breakAvailable
                      ? 'Short break slot is available'
                      : 'Short break slot is occupied'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isOnShortBreak
                    ? `Started at ${dayjs(lastBreak.start).format('h:mm A')}`
                    : breakAvailable
                      ? 'You can take a short break now'
                      : `${breakOccupant?.name} is currently on break (started ${dayjs(breakOccupant?.startedAt).format('h:mm A')})`}
                </p>
              </div>
              {isOnShortBreak ? (
                <Button onClick={() => breakMutation.mutate('end')} disabled={breakMutation.isPending} size="sm" variant="outline">
                  End Break
                </Button>
              ) : breakAvailable ? (
                <Button onClick={() => breakMutation.mutate('start')} disabled={breakMutation.isPending} size="sm" variant="outline">
                  Start Break
                </Button>
              ) : (
                <span className="text-xs text-amber-600 font-medium px-3 py-1.5 rounded-md bg-amber-50 dark:bg-amber-900/20">
                  Please Wait
                </span>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Employee: Today's Controls */}
      {!isAdmin && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <motion.div {...fadeUp}>
            <Card>
              <CardContent className="p-5 text-center">
                <Clock className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-sm text-muted-foreground mb-3">
                  {isCheckedIn ? (isCheckedOut ? 'Day Complete' : 'Working') : 'Not Checked In'}
                </p>
                {!isCheckedIn ? (
                  <Button onClick={() => checkInMutation.mutate()} disabled={checkInMutation.isPending} className="w-full" size="sm">
                    <LogIn className="h-4 w-4 mr-1" /> Check In
                  </Button>
                ) : !isCheckedOut ? (
                  <Button onClick={() => checkOutMutation.mutate()} disabled={checkOutMutation.isPending} variant="outline" className="w-full" size="sm">
                    <LogOut className="h-4 w-4 mr-1" /> Check Out
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {dayjs(attendance.checkIn).format('h:mm A')} — {dayjs(attendance.checkOut).format('h:mm A')}
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div {...fadeUp} transition={{ delay: 0.08 }}>
            <Card className={cn(
              'transition-all',
              attendance?.lunchBreakStart && !attendance?.lunchBreakEnd && 'ring-2 ring-amber-400 border-amber-400 bg-amber-50/50 dark:bg-amber-950/20 shadow-lg shadow-amber-100 dark:shadow-amber-900/20'
            )}>
              <CardContent className="p-5 text-center">
                <div className={cn(
                  'w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center transition-all',
                  attendance?.lunchBreakStart && !attendance?.lunchBreakEnd
                    ? 'bg-amber-500 animate-pulse'
                    : 'bg-amber-100 dark:bg-amber-900/30'
                )}>
                  <Coffee className={cn(
                    'h-7 w-7',
                    attendance?.lunchBreakStart && !attendance?.lunchBreakEnd ? 'text-white' : 'text-amber-500'
                  )} />
                </div>
                <p className={cn(
                  'text-sm font-medium mb-1',
                  attendance?.lunchBreakStart && !attendance?.lunchBreakEnd && 'text-amber-700 dark:text-amber-300'
                )}>
                  Lunch Break
                </p>
                {attendance?.lunchBreakStart && !attendance?.lunchBreakEnd && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-2 animate-pulse">
                    🍽️ On Lunch Since {dayjs(attendance.lunchBreakStart).format('h:mm A')}
                  </p>
                )}
                <div className="mt-2">
                  {!isCheckedIn || isCheckedOut ? (
                    <Button disabled size="sm" variant="outline" className="w-full">Unavailable</Button>
                  ) : !attendance?.lunchBreakStart ? (
                    <Button onClick={() => lunchMutation.mutate('start')} disabled={lunchMutation.isPending} size="sm" variant="outline" className="w-full border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/20">
                      Start Lunch
                    </Button>
                  ) : !attendance?.lunchBreakEnd ? (
                    <Button onClick={() => lunchMutation.mutate('end')} disabled={lunchMutation.isPending} size="sm" className="w-full bg-amber-500 hover:bg-amber-600 text-white">
                      End Lunch Break
                    </Button>
                  ) : (
                    <p className="text-xs text-muted-foreground">✓ {dayjs(attendance.lunchBreakStart).format('h:mm')} – {dayjs(attendance.lunchBreakEnd).format('h:mm A')}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div {...fadeUp} transition={{ delay: 0.16 }}>
            <Card>
              <CardContent className="p-5 text-center">
                <Timer className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                <p className="text-sm text-muted-foreground mb-1">Short Breaks</p>
                <p className="text-lg font-bold mb-2">{attendance?.shortBreaks?.length || 0}</p>
                <p className="text-[10px] text-muted-foreground">breaks taken today</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div {...fadeUp} transition={{ delay: 0.24 }}>
            <Card>
              <CardContent className="p-5 text-center">
                <Clock className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                <p className="text-sm text-muted-foreground mb-1">Working Hours</p>
                <p className="text-2xl font-bold">{(attendance?.totalWorkingHours || 0).toFixed(1)}h</p>
                <p className="text-xs text-muted-foreground">Break: {(attendance?.totalBreakHours || 0).toFixed(1)}h</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Admin: Today's Overview with Break Status */}
      {isAdmin && (
        <>
          {/* Break queue status for admin */}
          <motion.div {...fadeUp}>
            <Card className={breakData?.isAvailable ? 'border-emerald-200 dark:border-emerald-800' : 'border-amber-200 dark:border-amber-800'}>
              <CardContent className="p-4 flex items-center gap-3">
                <Timer className={`h-5 w-5 ${breakData?.isAvailable ? 'text-emerald-600' : 'text-amber-600'}`} />
                <p className="text-sm">
                  {breakData?.isAvailable
                    ? 'Short break slot is currently available — no one is on break'
                    : `${breakData?.onBreak?.name} is on a short break (since ${dayjs(breakData?.onBreak?.startedAt).format('h:mm A')})`}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div {...fadeUp} transition={{ delay: 0.1 }}>
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" /> Today&apos;s Attendance ({allToday.length} checked in)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {allToday.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No employees checked in yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="pb-2 font-medium">Employee</th>
                          <th className="pb-2 font-medium">Check In</th>
                          <th className="pb-2 font-medium">Check Out</th>
                          <th className="pb-2 font-medium">On Break</th>
                          <th className="pb-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allToday.map((a) => {
                          const lb = a.shortBreaks?.[a.shortBreaks.length - 1];
                          const onShort = lb && lb.start && !lb.end;
                          const onLunch = a.lunchBreakStart && !a.lunchBreakEnd;
                          return (
                            <tr key={a._id} className="border-b last:border-0">
                              <td className="py-2.5">{a.userId?.name}</td>
                              <td className="py-2.5">{a.checkIn ? dayjs(a.checkIn).format('h:mm A') : '—'}</td>
                              <td className="py-2.5">{a.checkOut ? dayjs(a.checkOut).format('h:mm A') : '—'}</td>
                              <td className="py-2.5">
                                {onShort ? (
                                  <span className="text-xs font-medium text-purple-600 bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded">Short Break</span>
                                ) : onLunch ? (
                                  <span className="text-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded">Lunch</span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </td>
                              <td className="py-2.5"><StatusBadge status={a.status} /></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}

      {/* History */}
      <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Attendance History</CardTitle>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{dayjs().month(i).format('MMMM')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : !historyData?.attendance?.length ? (
              <EmptyState title="No records" description="No attendance records for this month" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium">Date</th>
                      {isAdmin && <th className="pb-2 font-medium">Employee</th>}
                      <th className="pb-2 font-medium">Check In</th>
                      <th className="pb-2 font-medium">Check Out</th>
                      <th className="pb-2 font-medium">Hours</th>
                      <th className="pb-2 font-medium">Breaks</th>
                      <th className="pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyData.attendance.map((a) => (
                      <tr key={a._id} className="border-b last:border-0">
                        <td className="py-2">{dayjs(a.date).format('MMM D')}</td>
                        {isAdmin && <td className="py-2">{a.userId?.name}</td>}
                        <td className="py-2">{a.checkIn ? dayjs(a.checkIn).format('h:mm A') : '—'}</td>
                        <td className="py-2">{a.checkOut ? dayjs(a.checkOut).format('h:mm A') : '—'}</td>
                        <td className="py-2">{(a.totalWorkingHours || 0).toFixed(1)}h</td>
                        <td className="py-2">{(a.totalBreakHours || 0).toFixed(1)}h</td>
                        <td className="py-2"><StatusBadge status={a.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
