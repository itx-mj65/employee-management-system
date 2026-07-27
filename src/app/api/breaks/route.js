import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getUser } from '@/lib/api';
import Attendance from '@/models/Attendance';
import User from '@/models/User';
import Department from '@/models/Department';
import dayjs from 'dayjs';

export async function GET(request) {
  try {
    await connectDB();
    const { userId, role } = getUser(request);
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || dayjs().format('YYYY-MM-DD');
    const deptFilter = searchParams.get('department') || 'all';
    const empFilter = searchParams.get('employeeId') || 'all';

    const targetDate = dayjs(date).startOf('day').toDate();

    const userQuery = { isActive: true, role: { $ne: 'admin' } };
    if (role === 'team-lead') {
      const me = await User.findById(userId);
      userQuery.department = me?.department || '';
    } else if ((role === 'admin' || role === 'manager') && deptFilter !== 'all') {
      userQuery.department = deptFilter;
    }
    if (empFilter !== 'all') userQuery._id = empFilter;

    const users = await User.find(userQuery).select('_id name department');
    const uids = users.map(u => u._id);
    const deptMap = {};
    for (const u of users) deptMap[u._id.toString()] = u.department;

    // Cache department settings
    const allDepts = await Department.find({});
    const deptSettings = {};
    for (const d of allDepts) deptSettings[d.name] = { maxMins: d.shortBreakDuration || 15, slots: d.breakSlots || 1 };

    const records = await Attendance.find({ userId: { $in: uids }, date: targetDate })
      .populate('userId', 'name department');

    const breakEntries = [];
    let totalShort = 0, totalLunch = 0, lateBreaks = 0;

    for (const att of records) {
      const emp = att.userId;
      if (!emp) continue;
      const maxMins = deptSettings[emp.department]?.maxMins || 15;

      for (const brk of att.shortBreaks || []) {
        if (!brk.start) continue;
        const start = dayjs(brk.start);
        const end = brk.end ? dayjs(brk.end) : null;
        const duration = end ? end.diff(start, 'minute') : dayjs().diff(start, 'minute');
        const isActive = !brk.end;
        const isLate = duration > maxMins;
        breakEntries.push({
          _id: `${att._id}-s-${start.valueOf()}`,
          name: emp.name, department: emp.department, type: 'short',
          start: brk.start, end: brk.end || null,
          duration, maxMins, isLate, isActive,
          exceeded: isLate ? duration - maxMins : 0,
        });
        totalShort++;
        if (isLate) lateBreaks++;
      }

      if (att.lunchBreakStart) {
        const start = dayjs(att.lunchBreakStart);
        const end = att.lunchBreakEnd ? dayjs(att.lunchBreakEnd) : null;
        const duration = end ? end.diff(start, 'minute') : dayjs().diff(start, 'minute');
        breakEntries.push({
          _id: `${att._id}-l`,
          name: emp.name, department: emp.department, type: 'lunch',
          start: att.lunchBreakStart, end: att.lunchBreakEnd || null,
          duration, maxMins: 0, isLate: false, isActive: !att.lunchBreakEnd, exceeded: 0,
        });
        totalLunch++;
      }
    }

    breakEntries.sort((a, b) => {
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      return new Date(b.start) - new Date(a.start);
    });

    const activeBreaks = breakEntries.filter(b => b.isActive);
    const lateActive = activeBreaks.filter(b => b.isLate);

    return NextResponse.json({
      date, breaks: breakEntries, activeBreaks, lateActive,
      stats: { total: breakEntries.length, totalShort, totalLunch, active: activeBreaks.length, late: lateBreaks, lateNow: lateActive.length },
    });
  } catch (error) {
    console.error('Break report error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
