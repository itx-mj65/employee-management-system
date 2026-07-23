'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  LogIn, LogOut, Coffee, Timer, Clock, AlertTriangle, Download
} from 'lucide-react';
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

const fadeUp = { initial: { opacity: 0, y: 15 }, animate: { opacity: 1, y: 0 } };

export default function AttendancePage() {
  const { isAdmin, user } = useAuth();
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
    refetchInterval: 10000,
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['attendance-history', selectedMonth, selectedYear],
    queryFn: () => api.get('/attendance', { params: { month: selectedMonth, year: selectedYear } }).then(r => r.data),
  });

  const checkInMutation = useMutation({
    mutationFn: () => api.post('/attendance/check-in'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Checked in successfully!');
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: () => api.put('/attendance/check-out'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Checked out!');
    },
  });

  const lunchMutation = useMutation({
    mutationFn: (action) => api.put('/attendance/lunch', { action }),
    onSuccess: (_, action) => {
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
      toast.success(`Lunch break ${action}ed`);
    },
  });

  const breakMutation = useMutation({
    mutationFn: (action) => api.put('/attendance/break', { action }),
    onSuccess: (_, action) => {
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
      queryClient.invalidateQueries({ queryKey: ['break-status'] });
      toast.success(`Short break ${action}ed`);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Break error');
    },
  });

  if (todayLoading) return <PageSkeleton />;

  const attendance = isAdmin ? null : todayData?.attendance;
  const allToday = isAdmin ? (todayData?.attendance || []) : [];
  const isCheckedIn = !!attendance?.checkIn;
  const isCheckedOut = !!attendance?.checkOut;
  const isOnLunch = attendance?.lunchBreakStart && !attendance?.lunchBreakEnd;
  const lunchDone = !!attendance?.lunchBreakEnd;
  const lastBreak = attendance?.shortBreaks?.[attendance.shortBreaks.length - 1];
  const isOnShortBreak = lastBreak && lastBreak.start && !lastBreak.end;
  const breakAvailable = breakData?.isAvailable;

  return (
    <div className="space-y-6">
      {/* Employee: Today's Controls */}
      {!isAdmin && (
        <>
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
              <Card>
                <CardContent className="p-5 text-center">
                  <Coffee className="h-8 w-8 mx-auto mb-2 text-amber-500" />
                  <p className="text-sm text-muted-foreground mb-3">Lunch Break</p>
                  {!isCheckedIn || isCheckedOut ? (
                    <Button disabled size="sm" variant="outline" className="w-full">Unavailable</Button>
                  ) : !attendance?.lunchBreakStart ? (
                    <Button onClick={() => lunchMutation.mutate('start')} disabled={lunchMutation.isPending} size="sm" variant="outline" className="w-full">
                      Start Lunch
                    </Button>
                  ) : !attendance?.lunchBreakEnd ? (
                    <Button onClick={() => lunchMutation.mutate('end')} disabled={lunchMutation.isPending} size="sm" variant="outline" className="w-full">
                      End Lunch
                    </Button>
                  ) : (
                    <p className="text-xs text-muted-foreground">Lunch completed</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div {...fadeUp} transition={{ delay: 0.16 }}>
              <Card>
                <CardContent className="p-5 text-center">
                  <Timer className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                  <p className="text-sm text-muted-foreground mb-3">Short Break</p>
                  {!isCheckedIn || isCheckedOut ? (
                    <Button disabled size="sm" variant="outline" className="w-full">Unavailable</Button>
                  ) : isOnShortBreak ? (
                    <Button onClick={() => breakMutation.mutate('end')} disabled={breakMutation.isPending} size="sm" variant="outline" className="w-full">
                      End Break
                    </Button>
                  ) : (
                    <Button onClick={() => breakMutation.mutate('start')} disabled={breakMutation.isPending || !breakAvailable} size="sm" variant="outline" className="w-full">
                      {!breakAvailable ? 'Occupied' : 'Start Break'}
                    </Button>
                  )}
                  {!breakAvailable && breakData?.onBreak && (
                    <p className="text-[10px] text-amber-600 mt-1">
                      {breakData.onBreak.name} is on break
                    </p>
                  )}
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
        </>
      )}

      {/* Admin: Today's Overview */}
      {isAdmin && (
        <motion.div {...fadeUp}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Today&apos;s Attendance ({allToday.length} checked in)</CardTitle>
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
                        <th className="pb-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allToday.map((a) => (
                        <tr key={a._id} className="border-b last:border-0">
                          <td className="py-2">{a.userId?.name}</td>
                          <td className="py-2">{a.checkIn ? dayjs(a.checkIn).format('h:mm A') : '—'}</td>
                          <td className="py-2">{a.checkOut ? dayjs(a.checkOut).format('h:mm A') : '—'}</td>
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
      )}

      {/* History */}
      <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Attendance History</CardTitle>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>
                    {dayjs().month(i).format('MMMM')}
                  </SelectItem>
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
