import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Task from '@/models/Task';
import Attendance from '@/models/Attendance';
import User from '@/models/User';
import MonthlyRemark from '@/models/MonthlyRemark';
import dayjs from 'dayjs';

export async function GET(request) {
  try {
    await connectDB();
    const userId = request.headers.get('x-user-id');
    const role = request.headers.get('x-user-role');
    const { searchParams } = new URL(request.url);

    const employeeId = searchParams.get('employeeId');
    const month = parseInt(searchParams.get('month') || (dayjs().month() + 1));
    const year = parseInt(searchParams.get('year') || dayjs().year());

    const startDate = dayjs(`${year}-${month}-01`).startOf('month').toDate();
    const endDate = dayjs(`${year}-${month}-01`).endOf('month').toDate();
    const totalDays = dayjs(endDate).diff(dayjs(startDate), 'day') + 1;
    // Approximate working days (exclude weekends)
    let workingDays = 0;
    for (let d = 0; d < totalDays; d++) {
      const day = dayjs(startDate).add(d, 'day').day();
      if (day !== 0 && day !== 6) workingDays++;
    }

    // Single employee performance
    const getEmployeeStats = async (empId) => {
      const tasks = await Task.find({
        $or: [{ userId: empId }, { assignedTo: empId }],
        date: { $gte: startDate, $lte: endDate },
      });

      const totalTasks = tasks.length;
      const completed = tasks.filter(t => t.status === 'approved');
      const pending = tasks.filter(t => ['todo', 'in-progress', 'pending-approval', 'on-hold'].includes(t.status));
      const rejected = tasks.filter(t => t.status === 'rejected');

      // On-time vs late (tasks with deadline)
      let onTime = 0;
      let late = 0;
      completed.forEach(t => {
        if (t.deadline && t.completedAt) {
          if (dayjs(t.completedAt).isBefore(dayjs(t.deadline)) || dayjs(t.completedAt).isSame(dayjs(t.deadline), 'day')) {
            onTime++;
          } else {
            late++;
          }
        } else {
          onTime++; // No deadline = on time
        }
      });

      // Overdue (pending tasks past deadline)
      const overdue = tasks.filter(t =>
        t.deadline && !['approved', 'rejected'].includes(t.status) && dayjs().isAfter(dayjs(t.deadline))
      ).length;

      const attendance = await Attendance.find({
        userId: empId,
        date: { $gte: startDate, $lte: endDate },
      });
      const presentDays = attendance.filter(a => a.status === 'present').length;
      const totalHours = attendance.reduce((s, a) => s + (a.totalWorkingHours || 0), 0);
      const avgHoursPerDay = presentDays > 0 ? totalHours / presentDays : 0;
      const attendancePercentage = workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : 0;

      // Performance score calculation
      const completionRate = totalTasks > 0 ? (completed.length / totalTasks) * 100 : 0;
      const onTimeRate = completed.length > 0 ? (onTime / completed.length) * 100 : 100;
      const score = Math.round((completionRate * 0.4) + (onTimeRate * 0.3) + (attendancePercentage * 0.3));

      const remark = await MonthlyRemark.findOne({ userId: empId, month, year });

      return {
        totalTasks,
        completedTasks: completed.length,
        pendingTasks: pending.length,
        rejectedTasks: rejected.length,
        onTimeTasks: onTime,
        lateTasks: late,
        overdueTasks: overdue,
        presentDays,
        absentDays: workingDays - presentDays,
        totalWorkingHours: Math.round(totalHours * 10) / 10,
        avgHoursPerDay: Math.round(avgHoursPerDay * 10) / 10,
        attendancePercentage,
        completionRate: Math.round(completionRate),
        onTimeRate: Math.round(onTimeRate),
        performanceScore: score,
        remarks: remark?.remarks || '',
        adminScore: remark?.performanceScore || null,
      };
    };

    if (role === 'admin') {
      // Admin: get stats for all or specific employee
      if (employeeId && employeeId !== 'all') {
        const emp = await User.findById(employeeId).select('name email department position');
        const stats = await getEmployeeStats(employeeId);
        return NextResponse.json({ employee: emp, stats, month, year, workingDays });
      }

      // All employees
      const allEmployees = await User.find({ role: 'employee', isActive: true }).select('name email department position');
      const allStats = [];
      for (const emp of allEmployees) {
        const stats = await getEmployeeStats(emp._id);
        allStats.push({ employee: emp, stats });
      }

      // Sort by performance score desc
      allStats.sort((a, b) => b.stats.performanceScore - a.stats.performanceScore);

      // Aggregate totals
      const totals = {
        totalTasks: allStats.reduce((s, e) => s + e.stats.totalTasks, 0),
        completedTasks: allStats.reduce((s, e) => s + e.stats.completedTasks, 0),
        pendingTasks: allStats.reduce((s, e) => s + e.stats.pendingTasks, 0),
        avgAttendance: allStats.length > 0 ? Math.round(allStats.reduce((s, e) => s + e.stats.attendancePercentage, 0) / allStats.length) : 0,
        avgScore: allStats.length > 0 ? Math.round(allStats.reduce((s, e) => s + e.stats.performanceScore, 0) / allStats.length) : 0,
      };

      return NextResponse.json({ employees: allStats, totals, month, year, workingDays });
    }

    // Employee: own stats
    const emp = await User.findById(userId).select('name email department position');
    const stats = await getEmployeeStats(userId);
    return NextResponse.json({ employee: emp, stats, month, year, workingDays });
  } catch (error) {
    console.error('Performance error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
