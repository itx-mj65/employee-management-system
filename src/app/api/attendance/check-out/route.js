import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Attendance from '@/models/Attendance';
import User from '@/models/User';
import ReportSetting from '@/models/ReportSetting';
import DailyReport from '@/models/DailyReport';
import { workToday, dayjs } from '@/lib/date';

export async function PUT(request) {
  try {
    await connectDB();
    const userId = request.headers.get('x-user-id');
    const today = workToday();

    // Run attendance + user + report setting queries in parallel
    const [attendance, currentUser] = await Promise.all([
      Attendance.findOne({ userId, date: today }),
      User.findById(userId).select('department').lean(),
    ]);

    if (!attendance) return NextResponse.json({ error: 'Not checked in today' }, { status: 400 });
    if (attendance.checkOut) return NextResponse.json({ error: 'Already checked out' }, { status: 400 });

    // Check daily report requirement
    if (currentUser?.department) {
      const reportSetting = await ReportSetting.findOne({ department: currentUser.department, isActive: true }).lean();
      if (reportSetting) {
        let needsReport = false;
        if (reportSetting.mode === 'all') needsReport = true;
        else needsReport = reportSetting.specificUsers?.some(id => id.toString() === userId);
        
        if (needsReport) {
          const todayReport = await DailyReport.findOne({ userId, date: today }).select('_id').lean();
          if (!todayReport) {
            return NextResponse.json({ error: 'Please submit your daily report before checking out' }, { status: 400 });
          }
        }
      }
    }

    const now = new Date();
    attendance.checkOut = now;

    // Auto-end ongoing breaks
    if (attendance.lunchBreakStart && !attendance.lunchBreakEnd) attendance.lunchBreakEnd = now;
    const lastBreak = attendance.shortBreaks?.[attendance.shortBreaks.length - 1];
    if (lastBreak && lastBreak.start && !lastBreak.end) lastBreak.end = now;

    // Calculate hours
    const totalMinutes = dayjs(now).diff(dayjs(attendance.checkIn), 'minute');
    let breakMinutes = 0;
    if (attendance.lunchBreakStart && attendance.lunchBreakEnd) {
      breakMinutes += dayjs(attendance.lunchBreakEnd).diff(dayjs(attendance.lunchBreakStart), 'minute');
    }
    for (const brk of attendance.shortBreaks || []) {
      if (brk.start && brk.end) breakMinutes += dayjs(brk.end).diff(dayjs(brk.start), 'minute');
    }
    attendance.totalWorkingHours = Math.max(0, (totalMinutes - breakMinutes) / 60);
    attendance.totalBreakHours = breakMinutes / 60;

    await attendance.save();
    return NextResponse.json({ attendance, message: 'Checked out successfully' });
  } catch (error) {
    console.error('Check-out error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
