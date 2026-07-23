import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Attendance from '@/models/Attendance';
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
      if (attendance.lunchBreakStart) {
        return NextResponse.json({ error: 'Lunch break already started' }, { status: 400 });
      }
      attendance.lunchBreakStart = new Date();
    } else if (action === 'end') {
      if (!attendance.lunchBreakStart) {
        return NextResponse.json({ error: 'Lunch break not started' }, { status: 400 });
      }
      if (attendance.lunchBreakEnd) {
        return NextResponse.json({ error: 'Lunch break already ended' }, { status: 400 });
      }
      attendance.lunchBreakEnd = new Date();
    }

    await attendance.save();
    return NextResponse.json({ attendance, message: `Lunch break ${action}ed` });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
