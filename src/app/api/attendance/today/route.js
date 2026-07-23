import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Attendance from '@/models/Attendance';
import dayjs from 'dayjs';

export async function GET(request) {
  try {
    await connectDB();
    const userId = request.headers.get('x-user-id');
    const role = request.headers.get('x-user-role');
    const today = dayjs().startOf('day').toDate();

    if (role === 'admin') {
      const allAttendance = await Attendance.find({ date: today })
        .populate('userId', 'name email department position');
      return NextResponse.json({ attendance: allAttendance });
    }

    const attendance = await Attendance.findOne({ userId, date: today });
    return NextResponse.json({ attendance });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
