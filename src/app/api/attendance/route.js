import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Attendance from '@/models/Attendance';
import User from '@/models/User';
import dayjs from 'dayjs';

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

    if (role === 'admin') {
      // Admin can see anyone
      if (employeeId) query.userId = employeeId;
    } else if (role === 'manager' || role === 'team-lead') {
      // Manager/TL can see their department members
      if (employeeId) {
        // Verify the employee is in their department
        const me = await User.findById(userId).select('department').lean();
        const emp = await User.findById(employeeId).select('department').lean();
        if (emp?.department === me?.department) {
          query.userId = employeeId;
        } else {
          query.userId = userId; // fallback to own
        }
      } else {
        query.userId = userId; // own attendance if no filter
      }
    } else {
      query.userId = userId; // employees see own only
    }

    if (month && year) {
      const m = String(month).padStart(2, '0');
      const start = new Date(`${year}-${m}-01T00:00:00.000Z`);
      const end = new Date(new Date(start).setMonth(start.getMonth() + 1));
      query.date = { $gte: start, $lt: end };
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
