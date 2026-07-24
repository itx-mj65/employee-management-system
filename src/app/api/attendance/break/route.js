import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Attendance from '@/models/Attendance';
import Notification from '@/models/Notification';
import User from '@/models/User';
import Department from '@/models/Department';
import dayjs from 'dayjs';

export async function PUT(request) {
  try {
    await connectDB();
    const userId = request.headers.get('x-user-id');
    const { action } = await request.json();
    const today = dayjs().startOf('day').toDate();

    const attendance = await Attendance.findOne({ userId, date: today });
    if (!attendance) return NextResponse.json({ error: 'Not checked in today' }, { status: 400 });

    const currentUser = await User.findById(userId);
    const userDept = currentUser?.department || '';
    const dept = await Department.findOne({ name: userDept });
    const maxSlots = dept?.breakSlots || 1;
    const maxMinutes = dept?.shortBreakDuration || 15;

    if (action === 'start') {
      // Check active break already
      const lastBreak = attendance.shortBreaks?.[attendance.shortBreaks.length - 1];
      if (lastBreak && lastBreak.start && !lastBreak.end) {
        return NextResponse.json({ error: 'You already have an active break' }, { status: 400 });
      }

      // Check department break slots
      const deptUsers = await User.find({ department: userDept, isActive: true }).select('_id');
      const deptUids = deptUsers.map(u => u._id);
      const allAtt = await Attendance.find({ userId: { $in: deptUids }, date: today });

      let onBreakCount = 0;
      for (const a of allAtt) {
        if (a.userId.toString() === userId) continue;
        const lb = a.shortBreaks?.[a.shortBreaks.length - 1];
        if (lb && lb.start && !lb.end) onBreakCount++;
      }

      if (onBreakCount >= maxSlots) {
        return NextResponse.json({
          error: `All ${maxSlots} short break slot${maxSlots > 1 ? 's' : ''} in ${userDept} are occupied. Please wait.`
        }, { status: 400 });
      }

      attendance.shortBreaks.push({ start: new Date() });
      await attendance.save();

      return NextResponse.json({ 
        attendance, 
        message: `Short break started (${maxMinutes} min limit)`,
        breakDuration: maxMinutes,
      });
    } 
    
    if (action === 'end') {
      const lastBreak = attendance.shortBreaks[attendance.shortBreaks.length - 1];
      if (!lastBreak || lastBreak.end) return NextResponse.json({ error: 'No active break' }, { status: 400 });
      lastBreak.end = new Date();
      await attendance.save();

      // Calculate how long the break was
      const breakMins = dayjs(lastBreak.end).diff(dayjs(lastBreak.start), 'minute');
      const overTime = breakMins > maxMinutes;

      // Notify same department that slot is free
      const deptEmployees = await User.find({ department: userDept, role: { $ne: 'admin' }, isActive: true, _id: { $ne: userId } });
      if (deptEmployees.length > 0) {
        await Notification.insertMany(deptEmployees.map(emp => ({
          userId: emp._id, type: 'break-available',
          title: 'Short Break Available',
          message: `A short break slot in ${userDept} is now free.`,
        })));
      }

      return NextResponse.json({ 
        attendance, 
        message: `Break ended (${breakMins} min${overTime ? ' — exceeded ' + maxMinutes + ' min limit' : ''})`,
        breakMinutes: breakMins,
        exceeded: overTime,
      });
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
    const today = dayjs().startOf('day').toDate();

    const currentUser = await User.findById(userId);
    const userDept = currentUser?.department || '';
    const dept = await Department.findOne({ name: userDept });
    const maxSlots = dept?.breakSlots || 1;
    const maxMinutes = dept?.shortBreakDuration || 15;

    const deptUsers = await User.find({ department: userDept, isActive: true }).select('_id');
    const deptUids = deptUsers.map(u => u._id);
    const allAtt = await Attendance.find({ userId: { $in: deptUids }, date: today }).populate('userId', 'name');

    const onBreakList = [];
    for (const a of allAtt) {
      const lb = a.shortBreaks?.[a.shortBreaks.length - 1];
      if (lb && lb.start && !lb.end) {
        const elapsed = dayjs().diff(dayjs(lb.start), 'minute');
        onBreakList.push({ 
          userId: a.userId._id, 
          name: a.userId.name, 
          startedAt: lb.start,
          elapsed,
          exceeded: elapsed > maxMinutes,
        });
      }
    }

    return NextResponse.json({
      department: userDept,
      maxSlots,
      maxMinutes,
      onBreak: onBreakList,
      slotsUsed: onBreakList.length,
      slotsAvailable: Math.max(0, maxSlots - onBreakList.length),
      isAvailable: onBreakList.length < maxSlots,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
