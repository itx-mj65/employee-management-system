import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Attendance from '@/models/Attendance';
import dayjs from 'dayjs';

export async function PUT(request) {
  try {
    await connectDB();
    const userId = request.headers.get('x-user-id');
    const today = dayjs().startOf('day').toDate();

    const attendance = await Attendance.findOne({ userId, date: today });
    if (!attendance) return NextResponse.json({ error: 'Not checked in today' }, { status: 400 });
    if (attendance.checkOut) return NextResponse.json({ error: 'Already checked out' }, { status: 400 });

    const now = new Date();
    attendance.checkOut = now;

    // Auto-end any ongoing lunch break
    if (attendance.lunchBreakStart && !attendance.lunchBreakEnd) {
      attendance.lunchBreakEnd = now;
    }

    // Auto-end any ongoing short break
    const lastBreak = attendance.shortBreaks?.[attendance.shortBreaks.length - 1];
    if (lastBreak && lastBreak.start && !lastBreak.end) {
      lastBreak.end = now;
    }

    // Recalculate hours
    const totalMinutes = dayjs(now).diff(dayjs(attendance.checkIn), 'minute');
    let breakMinutes = 0;
    if (attendance.lunchBreakStart && attendance.lunchBreakEnd) {
      breakMinutes += dayjs(attendance.lunchBreakEnd).diff(dayjs(attendance.lunchBreakStart), 'minute');
    }
    for (const brk of attendance.shortBreaks || []) {
      if (brk.start && brk.end) {
        breakMinutes += dayjs(brk.end).diff(dayjs(brk.start), 'minute');
      }
    }

    attendance.totalWorkingHours = Math.max(0, (totalMinutes - breakMinutes) / 60);
    attendance.totalBreakHours = breakMinutes / 60;

    await attendance.save();
    return NextResponse.json({ attendance, message: 'Checked out successfully' });
  } catch (error) {
    console.error('Check-out error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
