import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Attendance from '@/models/Attendance';
import User from '@/models/User';
import dayjs from 'dayjs';

export async function GET(request) {
  try {
    await connectDB();
    const role = request.headers.get('x-user-role');
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || dayjs().month() + 1);
    const year = parseInt(searchParams.get('year') || dayjs().year());
    const employeeId = searchParams.get('employeeId');

    const startDate = dayjs(`${year}-${month}-01`).startOf('month').toDate();
    const endDate = dayjs(`${year}-${month}-01`).endOf('month').toDate();

    const query = { date: { $gte: startDate, $lte: endDate } };
    if (employeeId) query.userId = employeeId;

    const attendance = await Attendance.find(query)
      .populate('userId', 'name email department')
      .sort({ date: 1 });

    const employees = employeeId
      ? await User.find({ _id: employeeId })
      : await User.find({ role: 'employee', isActive: true });

    const totalWorkingDays = dayjs(endDate).diff(dayjs(startDate), 'day') + 1;

    const reports = employees.map(emp => {
      const empAttendance = attendance.filter(a => a.userId?._id?.toString() === emp._id.toString());
      const presentDays = empAttendance.filter(a => a.status === 'present').length;
      const totalHours = empAttendance.reduce((sum, a) => sum + (a.totalWorkingHours || 0), 0);
      const totalBreakHours = empAttendance.reduce((sum, a) => sum + (a.totalBreakHours || 0), 0);

      return {
        employee: { _id: emp._id, name: emp.name, email: emp.email, department: emp.department },
        presentDays,
        absentDays: totalWorkingDays - presentDays,
        totalWorkingHours: Math.round(totalHours * 100) / 100,
        totalBreakHours: Math.round(totalBreakHours * 100) / 100,
        attendancePercentage: Math.round((presentDays / totalWorkingDays) * 100),
        records: empAttendance,
      };
    });

    return NextResponse.json({ reports, month, year, totalWorkingDays });
  } catch (error) {
    console.error('Reports error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
