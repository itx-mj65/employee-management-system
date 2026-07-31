import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getUser } from '@/lib/api';
import Attendance from '@/models/Attendance';
import DailyReport from '@/models/DailyReport';
import User from '@/models/User';
import { workToday, dayjs, WORK_TZ } from '@/lib/date';

const SHIFT_END_HOUR = 18; // 6 PM ET = 3 AM PKT

export async function POST(request) {
  try {
    await connectDB();
    const { role } = getUser(request);
    if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const today = workToday();
    const now = dayjs().tz(WORK_TZ);

    // Find all open attendance from PREVIOUS days only (never touch today)
    const stale = await Attendance.find({
      checkIn: { $exists: true },
      checkOut: null,
      date: { $lt: today },
    }).populate('userId', 'name department');

    const results = [];
    for (const att of stale) {
      const attDate = dayjs(att.date).tz(WORK_TZ);
      const checkoutTime = attDate.hour(SHIFT_END_HOUR).minute(0).second(0).toDate();

      att.checkOut = checkoutTime;
      att.autoCheckout = true;

      const report = await DailyReport.findOne({ userId: att.userId._id || att.userId, date: att.date });
      att.reportMissing = !report;

      if (att.lunchBreakStart && !att.lunchBreakEnd) att.lunchBreakEnd = checkoutTime;
      const lastBreak = att.shortBreaks?.[att.shortBreaks.length - 1];
      if (lastBreak && lastBreak.start && !lastBreak.end) lastBreak.end = checkoutTime;

      const totalMinutes = dayjs(checkoutTime).diff(dayjs(att.checkIn), 'minute');
      let breakMinutes = 0;
      if (att.lunchBreakStart && att.lunchBreakEnd) breakMinutes += dayjs(att.lunchBreakEnd).diff(dayjs(att.lunchBreakStart), 'minute');
      for (const brk of att.shortBreaks || []) {
        if (brk.start && brk.end) breakMinutes += dayjs(brk.end).diff(dayjs(brk.start), 'minute');
      }
      att.totalWorkingHours = Math.max(0, (totalMinutes - breakMinutes) / 60);
      att.totalBreakHours = breakMinutes / 60;

      await att.save();
      results.push({ name: att.userId?.name, date: attDate.format('MMM D'), hours: att.totalWorkingHours.toFixed(1), reportMissing: att.reportMissing });
    }

    return NextResponse.json({ message: `${results.length} stale checkout(s) processed`, results });
  } catch (error) {
    console.error('Auto-checkout error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
