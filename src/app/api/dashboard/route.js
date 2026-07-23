import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Attendance from '@/models/Attendance';
import Task from '@/models/Task';
import Announcement from '@/models/Announcement';
import dayjs from 'dayjs';

export async function GET(request) {
  try {
    await connectDB();
    const role = request.headers.get('x-user-role');
    const userId = request.headers.get('x-user-id');
    const today = dayjs().startOf('day').toDate();

    if (role === 'admin') {
      const totalEmployees = await User.countDocuments({ role: 'employee', isActive: true });
      const todayAttendance = await Attendance.find({ date: today });
      const presentEmployees = todayAttendance.length;
      const absentEmployees = totalEmployees - presentEmployees;

      // On break
      let onBreakCount = 0;
      for (const a of todayAttendance) {
        const lastBreak = a.shortBreaks[a.shortBreaks.length - 1];
        if (lastBreak && lastBreak.start && !lastBreak.end) onBreakCount++;
        if (a.lunchBreakStart && !a.lunchBreakEnd) onBreakCount++;
      }

      const pendingApprovals = await Task.countDocuments({ status: 'pending-approval' });
      const todayTasks = await Task.find({ date: today });
      const completedTasks = todayTasks.filter(t => t.status === 'approved').length;

      // Weekly task stats
      const weekStart = dayjs().startOf('week').toDate();
      const weekTasks = await Task.find({ date: { $gte: weekStart, $lte: today } });

      const weeklyStats = {};
      for (let i = 0; i < 7; i++) {
        const day = dayjs().startOf('week').add(i, 'day');
        const dayStr = day.format('ddd');
        const dayTasks = weekTasks.filter(t =>
          dayjs(t.date).format('YYYY-MM-DD') === day.format('YYYY-MM-DD')
        );
        weeklyStats[dayStr] = {
          completed: dayTasks.filter(t => t.status === 'approved').length,
          pending: dayTasks.filter(t => t.status !== 'approved' && t.status !== 'rejected').length,
        };
      }

      return NextResponse.json({
        stats: {
          totalEmployees,
          presentEmployees,
          absentEmployees,
          onBreakCount,
          pendingApprovals,
          completedTasks,
          totalTodayTasks: todayTasks.length,
        },
        weeklyStats,
      });
    }

    // Employee dashboard
    const todayAttendance = await Attendance.findOne({ userId, date: today });
    const todayTasks = await Task.find({ userId, date: today });
    const pendingTasks = todayTasks.filter(t => ['todo', 'in-progress'].includes(t.status)).length;
    const completedTasks = todayTasks.filter(t => t.status === 'approved').length;
    const announcements = await Announcement.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(3)
      .populate('createdBy', 'name');

    return NextResponse.json({
      stats: {
        isCheckedIn: !!todayAttendance?.checkIn,
        isCheckedOut: !!todayAttendance?.checkOut,
        totalTasks: todayTasks.length,
        pendingTasks,
        completedTasks,
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
