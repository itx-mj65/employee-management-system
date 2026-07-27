import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

dayjs.extend(utc);
dayjs.extend(timezone);

// Work timezone — all "today" calculations use this
// Pakistan team works US hours: 6 PM - 3 AM PKT = 9 AM - 6 PM ET
const WORK_TZ = process.env.WORK_TIMEZONE || 'America/New_York';

// Get "today" in work timezone — the core function
// At 1 AM PKT (Jul 29) = 4 PM ET (Jul 28) → returns Jul 28
// At 6 PM PKT (Jul 28) = 9 AM ET (Jul 28) → returns Jul 28
export function workToday() {
  return dayjs().tz(WORK_TZ).startOf('day').toDate();
}

// Get current time in work timezone
export function workNow() {
  return dayjs().tz(WORK_TZ);
}

// Format a date in work timezone
export function workFormat(date, fmt = 'YYYY-MM-DD') {
  return dayjs(date).tz(WORK_TZ).format(fmt);
}

// Parse a date string in work timezone
export function workDate(dateStr) {
  return dayjs.tz(dateStr, WORK_TZ).startOf('day').toDate();
}

// Get work timezone name
export function getWorkTimezone() {
  return WORK_TZ;
}

export { dayjs, WORK_TZ };
