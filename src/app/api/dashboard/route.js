import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getUser } from '@/lib/api';
import User from '@/models/User';
import Attendance from '@/models/Attendance';
import Task from '@/models/Task';
import Leave from '@/models/Leave';
import Announcement from '@/models/Announcement';
import dayjs from 'dayjs';

export async function GET(request) {
  try {
    await connectDB();
    const { userId, role, isAdmin } = getUser(request);
    const today = dayjs().startOf('day').toDate();

    if (isAdmin) {
      const [totalEmployees, todayAttendance, pendingApprovals, pendingLeaves, todayTasks] = await Promise.all([
        User.countDocuments({ role: 'employee', isActive: true }),
        Attendance.find({ date: today }),
        Task.countDocuments({ status: 'pending-approval' }),
        Leave.countDocuments({ status: 'pending' }),
        Task.find({ date: today }),
      ]);

      const presentEmployees = todayAttendance.length;
      let onBreakCount = 0;
      for (const a of todayAttendance) {
        const lastBreak = a.shortBreaks?.[a.shortBreaks.length - 1];
        if (lastBreak && lastBreak.start && !lastBreak.end) onBreakCount++;
        if (a.lunchBreakStart && !a.lunchBreakEnd) onBreakCount++;
      }

      const completedTasks = todayTasks.filter(t => t.status === 'approved').length;

      // Weekly stats
      const weekStart = dayjs().startOf('week').toDate();
      const weekTasks = await Task.find({ date: { $gte: weekStart, $lte: today } });
      const weeklyStats = {};
      for (let i = 0; i < 7; i++) {
        const day = dayjs().startOf('week').add(i, 'day');
        const dayStr = day.format('ddd');
        const dayTasks = weekTasks.filter(t => dayjs(t.date).format('YYYY-MM-DD') === day.format('YYYY-MM-DD'));
        weeklyStats[dayStr] = {
          completed: dayTasks.filter(t => t.status === 'approved').length,
          pending: dayTasks.filter(t => !['approved', 'rejected'].includes(t.status)).length,
        };
      }

      return NextResponse.json({
        stats: {
          totalEmployees,
          presentEmployees,
          absentEmployees: totalEmployees - presentEmployees,
          onBreakCount,
          pendingApprovals,
          pendingLeaves,
          completedTasks,
          totalTodayTasks: todayTasks.length,
        },
        weeklyStats,
      });
    }

    // Employee dashboard — include assigned tasks
    const [todayAttendance, todayTasks, pendingLeaves, announcements] = await Promise.all([
      Attendance.findOne({ userId, date: today }),
      Task.find({ $or: [{ userId }, { assignedTo: userId }], date: today }),
      Leave.countDocuments({ userId, status: 'pending' }),
      Announcement.find({ isActive: true }).sort({ createdAt: -1 }).limit(3).populate('createdBy', 'name'),
    ]);

    const pendingTasks = todayTasks.filter(t => ['todo', 'in-progress'].includes(t.status)).length;
    const completedTasks = todayTasks.filter(t => t.status === 'approved').length;

    return NextResponse.json({
      stats: {
        isCheckedIn: !!todayAttendance?.checkIn,
        isCheckedOut: !!todayAttendance?.checkOut,
        totalTasks: todayTasks.length,
        pendingTasks,
        completedTasks,
        pendingLeaves,
        workingHours: todayAttendance?.totalWorkingHours || 0,
      },
      attendance: todayAttendance,
      recentAnnouncements: announcements,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
