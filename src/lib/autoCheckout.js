import Attendance from '@/models/Attendance';
import { workToday, dayjs, WORK_TZ } from '@/lib/date';

// Shift: 6 PM - 3 AM PKT = 9 AM - 6 PM ET
// Auto-checkout triggers 1 hour after shift end (7 PM ET / 4 AM PKT)
// Records checkout time as shift end (6 PM ET / 3 AM PKT)

const SHIFT_END_HOUR = 18;  // 6 PM in work timezone (= 3 AM PKT)
const GRACE_HOURS = 1;       // 1 hour grace after shift end

export async function autoCheckoutStale(userId) {
  try {
    const now = dayjs().tz(WORK_TZ);
    const today = workToday();
    
    // Find any attendance without checkout (could be today or previous days)
    const openAttendance = await Attendance.find({ 
      userId, 
      checkIn: { $exists: true }, 
      checkOut: null 
    }).sort({ date: -1 }).limit(5);

    for (const att of openAttendance) {
      const attDate = dayjs(att.date).tz(WORK_TZ);
      
      // Skip today's attendance — they might still be working
      if (attDate.format('YYYY-MM-DD') === now.format('YYYY-MM-DD')) {
        // But if past shift end + grace, auto-checkout today too
        if (now.hour() >= SHIFT_END_HOUR + GRACE_HOURS) {
          await performAutoCheckout(att, attDate);
        }
        continue;
      }
      
      // Previous days — always auto-checkout
      await performAutoCheckout(att, attDate);
    }
  } catch (e) {
    console.error('Auto-checkout error:', e);
  }
}

async function performAutoCheckout(att, attDate) {
  // Set checkout time to shift end (3 AM PKT / 6 PM ET) of that day
  const checkoutTime = attDate.hour(SHIFT_END_HOUR).minute(0).second(0).toDate();
  
  att.checkOut = checkoutTime;

  // Auto-end any open breaks
  if (att.lunchBreakStart && !att.lunchBreakEnd) {
    att.lunchBreakEnd = checkoutTime;
  }
  const lastBreak = att.shortBreaks?.[att.shortBreaks.length - 1];
  if (lastBreak && lastBreak.start && !lastBreak.end) {
    lastBreak.end = checkoutTime;
  }

  // Recalculate hours (only count until shift end)
  const checkIn = dayjs(att.checkIn);
  const checkOut = dayjs(checkoutTime);
  const totalMinutes = checkOut.diff(checkIn, 'minute');
  
  let breakMinutes = 0;
  if (att.lunchBreakStart && att.lunchBreakEnd) {
    breakMinutes += dayjs(att.lunchBreakEnd).diff(dayjs(att.lunchBreakStart), 'minute');
  }
  for (const brk of att.shortBreaks || []) {
    if (brk.start && brk.end) {
      breakMinutes += dayjs(brk.end).diff(dayjs(brk.start), 'minute');
    }
  }

  att.totalWorkingHours = Math.max(0, (totalMinutes - breakMinutes) / 60);
  att.totalBreakHours = breakMinutes / 60;

  await att.save();
}
