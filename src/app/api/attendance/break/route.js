import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Attendance from '@/models/Attendance';
import Notification from '@/models/Notification';
import User from '@/models/User';
import Department from '@/models/Department';
import { workToday, workDate, dayjs } from '@/lib/date';

export async function PUT(request) {
  try {
    await connectDB();
    const userId = request.headers.get('x-user-id');
    const userName = request.headers.get('x-user-name') || '';
    const { action } = await request.json();
    const today = workToday();

    const attendance = await Attendance.findOne({ userId, date: today });
    if (!attendance) return NextResponse.json({ error: 'Not checked in today' }, { status: 400 });

    const currentUser = await User.findById(userId);
    const userDept = currentUser?.department || '';
    const dept = await Department.findOne({ name: userDept });
    const maxSlots = dept?.breakSlots || 1;
    const maxMinutes = dept?.shortBreakDuration || 15;

    if (action === 'start') {
      const lastBreak = attendance.shortBreaks?.[attendance.shortBreaks.length - 1];
      if (lastBreak && lastBreak.start && !lastBreak.end) {
        return NextResponse.json({ error: 'You already have an active break' }, { status: 400 });
      }

      const deptUsers = await User.find({ department: userDept, isActive: true }).select('_id');
      const allAtt = await Attendance.find({ userId: { $in: deptUsers.map(u => u._id) }, date: today });

      let onBreakCount = 0;
      for (const a of allAtt) {
        if (a.userId.toString() === userId) continue;
        const lb = a.shortBreaks?.[a.shortBreaks.length - 1];
        if (lb && lb.start && !lb.end) onBreakCount++;
      }

      if (onBreakCount >= maxSlots) {
        return NextResponse.json({ error: `Break slot in ${userDept} is full. Please wait.` }, { status: 400 });
      }

      attendance.shortBreaks.push({ start: new Date() });
      await attendance.save();

      // Send notifications in background — don't let it crash the response
      try {
        const supervisors = await User.find({
          isActive: true,
          $or: [{ role: 'admin' }, { role: 'team-lead', department: userDept }],
          _id: { $ne: userId },
        });
        if (supervisors.length > 0) {
          await Notification.insertMany(supervisors.map(s => ({
            userId: s._id, type: 'announcement',
            title: '☕ Short Break Started',
            message: `${userName || currentUser.name} (${userDept}) started a short break — ${maxMinutes} min limit`,
          })));
        }
      } catch (e) { console.error('Break notification error:', e); }

      return NextResponse.json({ attendance, message: `Short break started (${maxMinutes} min)` });
    }

    if (action === 'end') {
      const lastBreak = attendance.shortBreaks[attendance.shortBreaks.length - 1];
      if (!lastBreak || lastBreak.end) return NextResponse.json({ error: 'No active break' }, { status: 400 });
      lastBreak.end = new Date();
      await attendance.save();

      const breakMins = dayjs(lastBreak.end).diff(dayjs(lastBreak.start), 'minute');
      const over = breakMins > maxMinutes;

      // Notify department that slot is free
      try {
        const deptEmps = await User.find({ department: userDept, role: { $ne: 'admin' }, isActive: true, _id: { $ne: userId } });
        if (deptEmps.length > 0) {
          await Notification.insertMany(deptEmps.map(emp => ({
            userId: emp._id, type: 'announcement',
            title: 'Break Slot Free',
            message: `Short break slot in ${userDept} is now available.`,
          })));
        }
        // Notify admin/TL if break was late
        if (over) {
          const supervisors = await User.find({
            isActive: true,
            $or: [{ role: 'admin' }, { role: 'team-lead', department: userDept }],
            _id: { $ne: userId },
          });
          if (supervisors.length > 0) {
            await Notification.insertMany(supervisors.map(s => ({
              userId: s._id, type: 'announcement',
              title: '⚠️ Break Exceeded',
              message: `${userName || currentUser.name} (${userDept}) took ${breakMins} min break (limit: ${maxMinutes} min)`,
            })));
          }
        }
      } catch (e) { console.error('Break end notification error:', e); }

      return NextResponse.json({ attendance, message: `Break ended (${breakMins} min${over ? ' — exceeded limit' : ''})` });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Break error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    await connectDB();
    const userId = request.headers.get('x-user-id');
    const today = workToday();

    const currentUser = await User.findById(userId);
    const userDept = currentUser?.department || '';
    const dept = await Department.findOne({ name: userDept });
    const maxSlots = dept?.breakSlots || 1;
    const maxMinutes = dept?.shortBreakDuration || 15;

    const deptUsers = await User.find({ department: userDept, isActive: true }).select('_id');
    const allAtt = await Attendance.find({ userId: { $in: deptUsers.map(u => u._id) }, date: today }).populate('userId', 'name');

    const onBreakList = [];
    for (const a of allAtt) {
      const lb = a.shortBreaks?.[a.shortBreaks.length - 1];
      if (lb && lb.start && !lb.end) {
        onBreakList.push({ userId: a.userId._id, name: a.userId.name, startedAt: lb.start, elapsed: dayjs().diff(dayjs(lb.start), 'minute') });
      }
    }

    return NextResponse.json({ department: userDept, maxSlots, maxMinutes, onBreak: onBreakList, slotsUsed: onBreakList.length, slotsAvailable: Math.max(0, maxSlots - onBreakList.length), isAvailable: onBreakList.length < maxSlots });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
