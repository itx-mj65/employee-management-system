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
    const monthStart = dayjs().startOf('month').toDate();

    if (isAdmin) {
      const [
        totalEmployees, todayAttendance, 
        pendingTL, pendingManager, pendingLeaves,
        monthTasks, todayTasks
      ] = await Promise.all([
        User.countDocuments({ role: { $ne: 'admin' }, isActive: true }),
        Attendance.find({ date: today }),
        Task.countDocuments({ status: 'pending-tl' }),
        Task.countDocuments({ status: 'pending-manager' }),
        Leave.countDocuments({ status: 'pending' }),
        Task.find({ date: { $gte: monthStart } }),
        Task.find({ date: today }),
      ]);

      const presentEmployees = todayAttendance.length;
      let onBreakCount = 0;
      for (const a of todayAttendance) {
        const lastBreak = a.shortBreaks?.[a.shortBreaks.length - 1];
        if (lastBreak && lastBreak.start && !lastBreak.end) onBreakCount++;
        if (a.lunchBreakStart && !a.lunchBreakEnd) onBreakCount++;
      }

      const allTasks = monthTasks;
      const completedTasks = allTasks.filter(t => t.status === 'approved').length;
      const pendingTasks = allTasks.filter(t => ['todo', 'in-progress', 'on-hold'].includes(t.status)).length;

      return NextResponse.json({
        stats: {
          totalEmployees,
          presentEmployees,
          absentEmployees: Math.max(0, totalEmployees - presentEmployees),
          onBreakCount,
          pendingApprovals: pendingTL + pendingManager,
          pendingLeaves,
          totalTasks: allTasks.length,
          completedTasks,
          pendingTasks,
          todayTasks: todayTasks.length,
        },
      });
    }

    // === NON-ADMIN DASHBOARD ===
    let taskQuery;
    if (role === 'team-lead') {
      const me = await User.findById(userId);
      const deptUsers = await User.find({ department: me?.department, isActive: true }).select('_id');
      const deptIds = deptUsers.map(u => u._id);
      taskQuery = { $or: [{ userId: { $in: deptIds } }, { assignedTo: { $in: deptIds } }] };
    } else if (role === 'manager') {
      const me = await User.findById(userId);
      const deptUsers = await User.find({ department: me?.department, isActive: true }).select('_id');
      const deptIds = deptUsers.map(u => u._id);
      taskQuery = { $or: [{ userId: { $in: deptIds } }, { assignedTo: { $in: deptIds } }] };
    } else {
      taskQuery = { $or: [{ userId }, { assignedTo: userId }] };
    }

    const [todayAttendance, monthTasks, todayTasksList, pendingLeaves, announcements, pendingApprovalCount] = await Promise.all([
      Attendance.findOne({ userId, date: today }),
      Task.find({ ...taskQuery, date: { $gte: monthStart } }),
      Task.find({ ...taskQuery, date: today }),
      Leave.countDocuments({ userId, status: 'pending' }),
      Announcement.find({ isActive: true }).sort({ createdAt: -1 }).limit(3).populate('createdBy', 'name'),
      role === 'team-lead' ? Task.countDocuments({ status: 'pending-tl' }) :
      role === 'manager' ? Task.countDocuments({ ...taskQuery, status: { $in: ['pending-tl', 'pending-manager'] } }) :
      Promise.resolve(0),
    ]);

    const totalTasks = monthTasks.length;
    const pendingTasks = monthTasks.filter(t => ['todo', 'in-progress', 'on-hold', 'pending-tl', 'pending-manager'].includes(t.status)).length;
    const completedTasks = monthTasks.filter(t => t.status === 'approved').length;
    const rejectedTasks = monthTasks.filter(t => t.status === 'rejected').length;

    return NextResponse.json({
      stats: {
        isCheckedIn: !!todayAttendance?.checkIn,
        isCheckedOut: !!todayAttendance?.checkOut,
        totalTasks,
        pendingTasks,
        completedTasks,
        rejectedTasks,
        todayTasks: todayTasksList.length,
        pendingLeaves,
        pendingApprovals: pendingApprovalCount,
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
