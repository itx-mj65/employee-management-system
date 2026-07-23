import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import MonthlyRemark from '@/models/MonthlyRemark';
import Task from '@/models/Task';
import Attendance from '@/models/Attendance';
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
    if (role === 'admin' && employeeId) {
      query.userId = employeeId;
    } else if (role !== 'admin') {
      query.userId = userId;
    }
    if (month) query.month = parseInt(month);
    if (year) query.year = parseInt(year);

    const remarks = await MonthlyRemark.find(query)
      .populate('userId', 'name email')
      .populate('createdBy', 'name')
      .sort({ year: -1, month: -1 });

    return NextResponse.json({ remarks });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const role = request.headers.get('x-user-role');
    const adminId = request.headers.get('x-user-id');

    if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { userId, month, year, remarks, performanceScore } = await request.json();

    // Calculate stats
    const startDate = dayjs(`${year}-${month}-01`).startOf('month').toDate();
    const endDate = dayjs(`${year}-${month}-01`).endOf('month').toDate();

    const tasks = await Task.find({
      userId,
      date: { $gte: startDate, $lte: endDate },
    });

    const completedTasks = tasks.filter(t => t.status === 'approved').length;
    const pendingTasks = tasks.filter(t => ['todo', 'in-progress', 'pending-approval'].includes(t.status)).length;
    const rejectedTasks = tasks.filter(t => t.status === 'rejected').length;

    const attendance = await Attendance.find({
      userId,
      date: { $gte: startDate, $lte: endDate },
    });

    const workingDays = dayjs(endDate).diff(dayjs(startDate), 'day') + 1;
    const presentDays = attendance.filter(a => a.status === 'present').length;
    const attendancePercentage = workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : 0;

    const remark = await MonthlyRemark.findOneAndUpdate(
      { userId, month, year },
      {
        completedTasks,
        pendingTasks,
        rejectedTasks,
        attendancePercentage,
        performanceScore: performanceScore || 0,
        remarks: remarks || '',
        createdBy: adminId,
      },
      { upsert: true, new: true }
    ).populate('userId', 'name email');

    return NextResponse.json({ remark, message: 'Remarks saved' });
  } catch (error) {
    console.error('Remarks error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
