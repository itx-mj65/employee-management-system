import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Attendance from '@/models/Attendance';
import User from '@/models/User';
import CompanyHoliday from '@/models/CompanyHoliday';
import dayjs from 'dayjs';

export async function GET(request) {
  try {
    await connectDB();
    const role = request.headers.get('x-user-role');
    if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');

    const start = fromDate ? dayjs(fromDate).startOf('day').toDate() : dayjs().startOf('month').toDate();
    const end = toDate ? dayjs(toDate).endOf('day').toDate() : dayjs().endOf('month').toDate();
    const totalDays = dayjs(end).diff(dayjs(start), 'day') + 1;

    let workingDays = 0;
    const allDates = [];
    for (let d = 0; d < totalDays; d++) {
      const date = dayjs(start).add(d, 'day');
      const isWeekend = date.day() === 0 || date.day() === 6;
      allDates.push({ date: date.format('YYYY-MM-DD'), dayName: date.format('ddd'), fullDay: date.format('dddd, MMM D'), isWeekend });
      if (!isWeekend) workingDays++;
    }

    const holidays = await CompanyHoliday.find({ date: { $gte: start, $lte: end } });
    const holidayDates = new Set(holidays.map(h => dayjs(h.date).format('YYYY-MM-DD')));
    const holidayMap = {};
    holidays.forEach(h => { holidayMap[dayjs(h.date).format('YYYY-MM-DD')] = h.title; });

    const employees = employeeId && employeeId !== 'all'
      ? await User.find({ _id: employeeId }).select('name email department position')
      : await User.find({ role: 'employee', isActive: true }).select('name email department position');

    const attendanceRecords = await Attendance.find({
      userId: { $in: employees.map(e => e._id) },
      date: { $gte: start, $lte: end },
    }).populate('userId', 'name email');

    const employeeReports = employees.map(emp => {
      const records = attendanceRecords.filter(a => a.userId?._id?.toString() === emp._id.toString());
      const presentDates = new Set(records.filter(r => r.status === 'present').map(r => dayjs(r.date).format('YYYY-MM-DD')));
      const absentDays = [];
      const dailyBreakdown = [];

      for (const d of allDates) {
        if (d.isWeekend) { dailyBreakdown.push({ ...d, status: 'weekend' }); continue; }
        if (holidayDates.has(d.date)) { dailyBreakdown.push({ ...d, status: 'holiday', holidayName: holidayMap[d.date] }); continue; }
        if (dayjs(d.date).isAfter(dayjs(), 'day')) { dailyBreakdown.push({ ...d, status: 'future' }); continue; }
        if (presentDates.has(d.date)) {
          const rec = records.find(r => dayjs(r.date).format('YYYY-MM-DD') === d.date);
          dailyBreakdown.push({ ...d, status: 'present', checkIn: rec?.checkIn, checkOut: rec?.checkOut, hours: rec?.totalWorkingHours || 0, breakHours: rec?.totalBreakHours || 0 });
        } else {
          dailyBreakdown.push({ ...d, status: 'absent' });
          absentDays.push({ date: d.date, day: d.fullDay });
        }
      }

      const presentCount = presentDates.size;
      const pastWorkingDays = allDates.filter(d => !d.isWeekend && !holidayDates.has(d.date) && !dayjs(d.date).isAfter(dayjs(), 'day')).length;
      const absentCount = Math.max(0, pastWorkingDays - presentCount);
      const totalHours = records.reduce((s, r) => s + (r.totalWorkingHours || 0), 0);
      const totalBreakHours = records.reduce((s, r) => s + (r.totalBreakHours || 0), 0);
      const attendanceRate = pastWorkingDays > 0 ? Math.round((presentCount / pastWorkingDays) * 100) : 0;

      return {
        employee: emp,
        presentCount, absentCount, attendanceRate,
        totalHours: Math.round(totalHours * 10) / 10,
        totalBreakHours: Math.round(totalBreakHours * 10) / 10,
        avgHoursPerDay: presentCount > 0 ? Math.round((totalHours / presentCount) * 10) / 10 : 0,
        absentDays, dailyBreakdown,
        lateCheckIns: records.filter(r => r.checkIn && dayjs(r.checkIn).hour() >= 10).length,
      };
    });

    const dailyPresenceChart = [];
    const pastDates = allDates.filter(d => !d.isWeekend && !holidayDates.has(d.date) && !dayjs(d.date).isAfter(dayjs(), 'day'));
    for (const d of pastDates) {
      const present = attendanceRecords.filter(r => dayjs(r.date).format('YYYY-MM-DD') === d.date && r.status === 'present').length;
      dailyPresenceChart.push({ date: dayjs(d.date).format('MMM D'), present, absent: employees.length - present });
    }

    return NextResponse.json({
      employeeReports, dailyPresenceChart,
      summary: {
        totalEmployees: employees.length, workingDays, holidays: holidays.length,
        avgAttendanceRate: employeeReports.length > 0 ? Math.round(employeeReports.reduce((s, r) => s + r.attendanceRate, 0) / employeeReports.length) : 0,
      },
      dateRange: { from: dayjs(start).format('YYYY-MM-DD'), to: dayjs(end).format('YYYY-MM-DD') },
    });
  } catch (error) {
    console.error('Attendance analytics error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
