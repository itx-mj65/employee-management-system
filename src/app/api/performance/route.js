import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getUser } from '@/lib/api';
import Task from '@/models/Task';
import Attendance from '@/models/Attendance';
import Leave from '@/models/Leave';
import User from '@/models/User';
import MonthlyRemark from '@/models/MonthlyRemark';
import dayjs from 'dayjs';

export async function GET(request) {
  try {
    await connectDB();
    const { userId, role, isAdmin } = getUser(request);
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const month = parseInt(searchParams.get('month') || (dayjs().month() + 1));
    const year = parseInt(searchParams.get('year') || dayjs().year());

    const startDate = dayjs(`${year}-${month}-01`).startOf('month').toDate();
    const endDate = dayjs(`${year}-${month}-01`).endOf('month').toDate();

    let workingDays = 0;
    for (let d = 0; d < dayjs(endDate).diff(dayjs(startDate), 'day') + 1; d++) {
      const day = dayjs(startDate).add(d, 'day').day();
      if (day !== 0 && day !== 6) workingDays++;
    }

    const getStats = async (empId) => {
      const [tasks, attendance, leaves, remark] = await Promise.all([
        Task.find({ $or: [{ userId: empId }, { assignedTo: empId }], date: { $gte: startDate, $lte: endDate } }),
        Attendance.find({ userId: empId, date: { $gte: startDate, $lte: endDate } }),
        Leave.find({ userId: empId, status: 'approved', startDate: { $lte: endDate }, endDate: { $gte: startDate } }),
        MonthlyRemark.findOne({ userId: empId, month, year }),
      ]);

      // Calculate approved leave days in this month
      let leaveDays = 0;
      for (const l of leaves) {
        let d = dayjs(l.startDate).isBefore(dayjs(startDate)) ? dayjs(startDate) : dayjs(l.startDate);
        const leaveEnd = dayjs(l.endDate).isAfter(dayjs(endDate)) ? dayjs(endDate) : dayjs(l.endDate);
        while (d.isBefore(leaveEnd) || d.isSame(leaveEnd, 'day')) {
          if (d.day() !== 0 && d.day() !== 6) leaveDays++;
          d = d.add(1, 'day');
        }
      }

      const completed = tasks.filter(t => t.status === 'approved');
      const pending = tasks.filter(t => ['todo', 'in-progress', 'pending-approval', 'on-hold'].includes(t.status));
      const rejected = tasks.filter(t => t.status === 'rejected');

      let onTime = 0, late = 0;
      completed.forEach(t => {
        if (t.deadline && t.completedAt) {
          if (dayjs(t.completedAt).isBefore(dayjs(t.deadline)) || dayjs(t.completedAt).isSame(dayjs(t.deadline), 'day')) onTime++;
          else late++;
        } else onTime++;
      });

      const overdue = tasks.filter(t => t.deadline && !['approved', 'rejected'].includes(t.status) && dayjs().isAfter(dayjs(t.deadline))).length;
      const presentDays = attendance.filter(a => a.status === 'present').length;
      const totalHours = attendance.reduce((s, a) => s + (a.totalWorkingHours || 0), 0);

      // Effective working days = working days - leave days
      const effectiveWorkDays = Math.max(1, workingDays - leaveDays);
      const attendancePercentage = effectiveWorkDays > 0 ? Math.round((presentDays / effectiveWorkDays) * 100) : 0;
      const completionRate = tasks.length > 0 ? (completed.length / tasks.length) * 100 : 0;
      const onTimeRate = completed.length > 0 ? (onTime / completed.length) * 100 : 100;
      const score = Math.round((completionRate * 0.4) + (Math.min(onTimeRate, 100) * 0.3) + (Math.min(attendancePercentage, 100) * 0.3));

      return {
        totalTasks: tasks.length, completedTasks: completed.length, pendingTasks: pending.length,
        rejectedTasks: rejected.length, onTimeTasks: onTime, lateTasks: late, overdueTasks: overdue,
        presentDays, absentDays: Math.max(0, effectiveWorkDays - presentDays), leaveDays,
        totalWorkingHours: Math.round(totalHours * 10) / 10,
        avgHoursPerDay: presentDays > 0 ? Math.round((totalHours / presentDays) * 10) / 10 : 0,
        attendancePercentage: Math.min(attendancePercentage, 100),
        completionRate: Math.round(completionRate), onTimeRate: Math.round(Math.min(onTimeRate, 100)),
        performanceScore: Math.min(score, 100),
        remarks: remark?.remarks || '', adminScore: remark?.performanceScore || null,
      };
    };

    if (isAdmin) {
      if (employeeId && employeeId !== 'all') {
        const emp = await User.findById(employeeId).select('name email department position');
        const stats = await getStats(employeeId);
        return NextResponse.json({ employee: emp, stats, month, year, workingDays });
      }
      const allEmployees = await User.find({ role: 'employee', isActive: true }).select('name email department position');
      const allStats = await Promise.all(allEmployees.map(async emp => ({ employee: emp, stats: await getStats(emp._id) })));
      allStats.sort((a, b) => b.stats.performanceScore - a.stats.performanceScore);
      const totals = {
        totalTasks: allStats.reduce((s, e) => s + e.stats.totalTasks, 0),
        completedTasks: allStats.reduce((s, e) => s + e.stats.completedTasks, 0),
        pendingTasks: allStats.reduce((s, e) => s + e.stats.pendingTasks, 0),
        avgAttendance: allStats.length > 0 ? Math.round(allStats.reduce((s, e) => s + e.stats.attendancePercentage, 0) / allStats.length) : 0,
        avgScore: allStats.length > 0 ? Math.round(allStats.reduce((s, e) => s + e.stats.performanceScore, 0) / allStats.length) : 0,
      };
      return NextResponse.json({ employees: allStats, totals, month, year, workingDays });
    }

    const emp = await User.findById(userId).select('name email department position');
    const stats = await getStats(userId);
    return NextResponse.json({ employee: emp, stats, month, year, workingDays });
  } catch (error) {
    console.error('Performance error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
