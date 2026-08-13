import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Attendance from '@/models/Attendance';
import User from '@/models/User';
import { workToday } from '@/lib/date';

export async function GET(request) {
  try {
    await connectDB();
    const userId = request.headers.get('x-user-id');
    const role = request.headers.get('x-user-role');
    const today = workToday();

    if (role === 'admin') {
      // Admin sees all
      const allAttendance = await Attendance.find({ date: today })
        .populate('userId', 'name email department position')
        .lean();
      return NextResponse.json({ attendance: allAttendance });
    }

    if (role === 'manager' || role === 'team-lead') {
      // Manager/TL sees their department
      const me = await User.findById(userId).select('department').lean();
      const deptUsers = await User.find({ department: me?.department, isActive: true }).select('_id').lean();
      const deptIds = deptUsers.map(u => u._id);
      const allAttendance = await Attendance.find({ date: today, userId: { $in: deptIds } })
        .populate('userId', 'name email department position')
        .lean();
      return NextResponse.json({ attendance: allAttendance });
    }

    // Employee sees own
    const attendance = await Attendance.findOne({ userId, date: today }).lean();
    return NextResponse.json({ attendance });
  } catch (error) {
    console.error('Attendance today error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
