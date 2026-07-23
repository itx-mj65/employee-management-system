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
    if (!attendance) {
      return NextResponse.json({ error: 'Not checked in today' }, { status: 400 });
    }
    if (attendance.checkOut) {
      return NextResponse.json({ error: 'Already checked out' }, { status: 400 });
    }

    attendance.checkOut = new Date();

    // Calculate total working hours
    const checkInTime = dayjs(attendance.checkIn);
    const checkOutTime = dayjs(attendance.checkOut);
    const totalMinutes = checkOutTime.diff(checkInTime, 'minute');

    // Subtract break hours
    let breakMinutes = 0;
    if (attendance.lunchBreakStart && attendance.lunchBreakEnd) {
      breakMinutes += dayjs(attendance.lunchBreakEnd).diff(dayjs(attendance.lunchBreakStart), 'minute');
    }
    for (const brk of attendance.shortBreaks) {
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
