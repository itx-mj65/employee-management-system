import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getUser } from '@/lib/api';
import Task from '@/models/Task';
import User from '@/models/User';
import dayjs from 'dayjs';

export async function GET(request) {
  try {
    await connectDB();
    const { userId, role } = getUser(request);
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || (dayjs().month() + 1));
    const year = parseInt(searchParams.get('year') || dayjs().year());

    const m = String(month).padStart(2, '0');
    const start = new Date(`${year}-${m}-01T00:00:00.000Z`);
    const end = new Date(new Date(start).setMonth(start.getMonth() + 1));

    let employeeQuery = { isActive: true, role: { $in: ['employee', 'team-lead'] } };

    if (role === 'team-lead' || role === 'manager') {
      const me = await User.findById(userId).lean();
      employeeQuery.department = me?.department;
    } else if (role === 'employee') {
      employeeQuery._id = userId;
    }

    const employees = await User.find(employeeQuery).select('name department position').lean();

    const reports = [];
    for (const emp of employees) {
      const tasks = await Task.find({
        userId: emp._id,
        updatedAt: { $gte: start, $lt: end },
      }).select('title status productiveSeconds priority updatedAt').lean();

      const approved = tasks.filter(t => t.status === 'approved');
      const totalSeconds = tasks.reduce((s, t) => s + (t.productiveSeconds || 0), 0);
      const approvedSeconds = approved.reduce((s, t) => s + (t.productiveSeconds || 0), 0);

      reports.push({
        employee: emp,
        totalTasks: tasks.length,
        approvedTasks: approved.length,
        submittedTasks: tasks.filter(t => t.status === 'submitted').length,
        returnedTasks: tasks.filter(t => t.status === 'returned').length,
        totalProductiveHours: +(totalSeconds / 3600).toFixed(1),
        approvedProductiveHours: +(approvedSeconds / 3600).toFixed(1),
        avgHoursPerTask: approved.length > 0 ? +(approvedSeconds / approved.length / 3600).toFixed(1) : 0,
        tasks: tasks.map(t => ({ title: t.title, status: t.status, hours: +(t.productiveSeconds / 3600).toFixed(1), priority: t.priority })),
      });
    }

    reports.sort((a, b) => b.approvedProductiveHours - a.approvedProductiveHours);

    return NextResponse.json({
      reports,
      summary: {
        totalEmployees: reports.length,
        totalApprovedTasks: reports.reduce((s, r) => s + r.approvedTasks, 0),
        totalProductiveHours: +reports.reduce((s, r) => s + r.totalProductiveHours, 0).toFixed(1),
      },
    });
  } catch (error) {
    console.error('Productive report error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
