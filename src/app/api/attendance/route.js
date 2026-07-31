import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Attendance from '@/models/Attendance';
import { dayjs, WORK_TZ } from '@/lib/date';

export async function GET(request) {
  try {
    await connectDB();
    const userId = request.headers.get('x-user-id');
    const role = request.headers.get('x-user-role');
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    const query = {};

    if (role === 'admin' && employeeId) {
      query.userId = employeeId;
    } else if (role !== 'admin') {
      query.userId = userId;
    }

    if (month && year) {
      const start = dayjs.tz(`${year}-${String(month).padStart(2,'0')}-01`, WORK_TZ).startOf('month').toDate();
      const end = dayjs.tz(`${year}-${String(month).padStart(2,'0')}-01`, WORK_TZ).endOf('month').toDate();
      query.date = { $gte: start, $lte: end };
    }

    const attendance = await Attendance.find(query)
      .populate('userId', 'name email department')
      .sort({ date: -1 })
      .lean();

    return NextResponse.json({ attendance });
  } catch (error) {
    console.error('Get attendance error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
