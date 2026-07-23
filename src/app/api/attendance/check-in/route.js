import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Attendance from '@/models/Attendance';
import dayjs from 'dayjs';

export async function POST(request) {
  try {
    await connectDB();
    const userId = request.headers.get('x-user-id');
    const today = dayjs().startOf('day').toDate();

    const existing = await Attendance.findOne({ userId, date: today });
    if (existing) {
      return NextResponse.json({ error: 'Already checked in today' }, { status: 400 });
    }

    const attendance = await Attendance.create({
      userId,
      date: today,
      checkIn: new Date(),
      status: 'present',
    });

    return NextResponse.json({ attendance, message: 'Checked in successfully' }, { status: 201 });
  } catch (error) {
    console.error('Check-in error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
