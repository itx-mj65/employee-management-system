import Attendance from '@/models/Attendance';
import DailyReport from '@/models/DailyReport';
import { workToday, dayjs, WORK_TZ } from '@/lib/date';

const SHIFT_END_HOUR = 18;
const GRACE_HOURS = 1;

export async function autoCheckoutStale(userId) {
  try {
    const now = dayjs().tz(WORK_TZ);

    const openAttendance = await Attendance.find({ 
      userId, checkIn: { $exists: true }, checkOut: null 
    }).sort({ date: -1 }).limit(5);

    for (const att of openAttendance) {
      const attDate = dayjs(att.date).tz(WORK_TZ);
      
      if (attDate.format('YYYY-MM-DD') === now.format('YYYY-MM-DD')) {
        if (now.hour() >= SHIFT_END_HOUR + GRACE_HOURS) {
          await performAutoCheckout(att, attDate, userId);
        }
        continue;
      }
      
      await performAutoCheckout(att, attDate, userId);
    }
  } catch (e) {
    console.error('Auto-checkout error:', e);
  }
}

async function performAutoCheckout(att, attDate, userId) {
  const checkoutTime = attDate.hour(SHIFT_END_HOUR).minute(0).second(0).toDate();
  
  att.checkOut = checkoutTime;
  att.autoCheckout = true;

  // Check if daily report was submitted for this date
  const report = await DailyReport.findOne({ userId, date: att.date });
  att.reportMissing = !report;

  // Auto-end open breaks
  if (att.lunchBreakStart && !att.lunchBreakEnd) att.lunchBreakEnd = checkoutTime;
  const lastBreak = att.shortBreaks?.[att.shortBreaks.length - 1];
  if (lastBreak && lastBreak.start && !lastBreak.end) lastBreak.end = checkoutTime;

  // Recalculate hours
  const totalMinutes = dayjs(checkoutTime).diff(dayjs(att.checkIn), 'minute');
  let breakMinutes = 0;
  if (att.lunchBreakStart && att.lunchBreakEnd) breakMinutes += dayjs(att.lunchBreakEnd).diff(dayjs(att.lunchBreakStart), 'minute');
  for (const brk of att.shortBreaks || []) {
    if (brk.start && brk.end) breakMinutes += dayjs(brk.end).diff(dayjs(brk.start), 'minute');
  }
  att.totalWorkingHours = Math.max(0, (totalMinutes - breakMinutes) / 60);
  att.totalBreakHours = breakMinutes / 60;

  await att.save();
}
