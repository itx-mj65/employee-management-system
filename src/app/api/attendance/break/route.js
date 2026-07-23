import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Attendance from '@/models/Attendance';
import Notification from '@/models/Notification';
import User from '@/models/User';
import dayjs from 'dayjs';

export async function PUT(request) {
  try {
    await connectDB();
    const userId = request.headers.get('x-user-id');
    const { action } = await request.json();
    const today = dayjs().startOf('day').toDate();

    const attendance = await Attendance.findOne({ userId, date: today });
    if (!attendance) {
      return NextResponse.json({ error: 'Not checked in today' }, { status: 400 });
    }

    if (action === 'start') {
      // Check if anyone is on a short break
      const allAttendance = await Attendance.find({ date: today });
      const someoneOnBreak = allAttendance.some(a => {
        if (a.userId.toString() === userId) return false;
        const lastBreak = a.shortBreaks[a.shortBreaks.length - 1];
        return lastBreak && lastBreak.start && !lastBreak.end;
      });

      if (someoneOnBreak) {
        return NextResponse.json(
          { error: 'Another employee is currently on a short break. Please wait.' },
          { status: 400 }
        );
      }

      attendance.shortBreaks.push({ start: new Date() });
    } else if (action === 'end') {
      const lastBreak = attendance.shortBreaks[attendance.shortBreaks.length - 1];
      if (!lastBreak || lastBreak.end) {
        return NextResponse.json({ error: 'No active short break' }, { status: 400 });
      }
      lastBreak.end = new Date();

      // Notify all employees that break is available
      const employees = await User.find({ role: 'employee', isActive: true, _id: { $ne: userId } });
      const notifications = employees.map(emp => ({
        userId: emp._id,
        type: 'break-available',
        title: 'Short Break Available',
        message: 'The short break slot is now available.',
      }));
      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }
    }

    await attendance.save();
    return NextResponse.json({ attendance, message: `Short break ${action}ed` });
  } catch (error) {
    console.error('Break error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    await connectDB();
    const today = dayjs().startOf('day').toDate();
    const allAttendance = await Attendance.find({ date: today }).populate('userId', 'name');

    let onBreak = null;
    for (const a of allAttendance) {
      const lastBreak = a.shortBreaks[a.shortBreaks.length - 1];
      if (lastBreak && lastBreak.start && !lastBreak.end) {
        onBreak = {
          userId: a.userId._id,
          name: a.userId.name,
          startedAt: lastBreak.start,
        };
        break;
      }
    }

    return NextResponse.json({ onBreak, isAvailable: !onBreak });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
