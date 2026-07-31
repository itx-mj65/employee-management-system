import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getUser } from '@/lib/api';
import CheckoutRequest from '@/models/CheckoutRequest';
import Attendance from '@/models/Attendance';
import User from '@/models/User';
import Notification from '@/models/Notification';
import { dayjs } from '@/lib/date';

export async function GET(request) {
  try {
    await connectDB();
    const { userId, role } = getUser(request);

    let query = {};
    if (role === 'admin') {
      // admin sees all
    } else if (role === 'team-lead' || role === 'manager') {
      const me = await User.findById(userId);
      query.department = me?.department || '';
    } else {
      query.employeeId = userId;
    }

    const requests = await CheckoutRequest.find(query)
      .populate('employeeId', 'name department')
      .populate('requestedBy', 'name')
      .populate('completedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('Get checkout requests error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const { userId, role } = getUser(request);
    if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { employeeId } = await request.json();
    if (!employeeId) return NextResponse.json({ error: 'Employee required' }, { status: 400 });

    const employee = await User.findById(employeeId);
    if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    // Find all attendance without checkout for this employee
    // Only previous days — never include today
    const today = new Date(dayjs().tz('America/New_York').startOf('day').valueOf());
    const pending = await Attendance.find({
      userId: employeeId,
      checkIn: { $exists: true },
      checkOut: null,
      date: { $lt: today },
    }).sort({ date: 1 });

    if (pending.length === 0) {
      return NextResponse.json({ error: 'No pending checkouts found' }, { status: 400 });
    }

    // Find TL of this department
    const tl = await User.findOne({ department: employee.department, role: 'team-lead', isActive: true });

    const dates = pending.map(a => ({
      date: a.date,
      checkIn: a.checkIn,
      checkoutTime: '',
    }));

    // Check if request already exists
    const existing = await CheckoutRequest.findOne({ employeeId, status: 'pending' });
    if (existing) {
      // Update with latest dates
      existing.dates = dates;
      await existing.save();
      return NextResponse.json({ request: existing, message: `Request updated — ${dates.length} dates` });
    }

    const req = await CheckoutRequest.create({
      employeeId,
      requestedBy: userId,
      assignedTo: tl?._id || null,
      department: employee.department,
      dates,
    });

    // Notify TL
    if (tl) {
      await Notification.create({
        userId: tl._id,
        type: 'announcement',
        title: 'Checkout Time Needed',
        message: `Admin requests checkout times for ${employee.name} (${dates.length} dates)`,
        relatedId: req._id,
      });
    }

    const populated = await CheckoutRequest.findById(req._id)
      .populate('employeeId', 'name department')
      .populate('requestedBy', 'name')
      .lean();

    return NextResponse.json({ request: populated, message: `Request sent — ${dates.length} dates` }, { status: 201 });
  } catch (error) {
    console.error('Create checkout request error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await connectDB();
    const { userId, role } = getUser(request);
    if (!['admin', 'team-lead', 'manager'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { requestId, action, dateIdx, dates, remarks } = body;
    const req = await CheckoutRequest.findById(requestId);
    if (!req) return NextResponse.json({ error: 'Request not found' }, { status: 404 });

    // Remove a specific date from request
    if (action === 'remove-date' && dateIdx !== undefined) {
      req.dates.splice(dateIdx, 1);
      if (req.dates.length === 0) {
        await CheckoutRequest.findByIdAndDelete(requestId);
        return NextResponse.json({ message: 'Request deleted — no dates left' });
      }
      await req.save();
      return NextResponse.json({ message: 'Date removed', request: req });
    }

    // Update attendance records
    let updated = 0;
    for (const entry of dates) {
      if (!entry.checkoutTime) continue;

      // Parse time like "3:00 AM" or "2:45 AM"
      const att = await Attendance.findOne({ userId: req.employeeId, date: new Date(entry.date) });
      if (!att) continue;

      // Parse time — TL enters PKT time (e.g. "3:00 AM" means 3 AM Pakistan time)
      const [time, period] = entry.checkoutTime.split(' ');
      const [hourStr, minStr] = time.split(':');
      let hour = parseInt(hourStr);
      const min = parseInt(minStr) || 0;
      if (period?.toUpperCase() === 'PM' && hour !== 12) hour += 12;
      if (period?.toUpperCase() === 'AM' && hour === 12) hour = 0;
      
      // Get the check-in date in PKT to figure out which calendar day
      const checkInPKT = dayjs(att.checkIn).tz('Asia/Karachi');
      const checkInDay = checkInPKT.format('YYYY-MM-DD');
      
      // AM times (12 AM - 11 AM) are next calendar day in PKT (night shift ends next morning)
      // PM times (12 PM - 11 PM) are same calendar day in PKT
      let checkoutDay;
      if (hour < 12) {
        checkoutDay = dayjs(checkInDay).add(1, 'day').format('YYYY-MM-DD');
      } else {
        checkoutDay = checkInDay;
      }
      
      // Build checkout in PKT timezone, then convert to UTC for storage
      const paddedHour = String(hour).padStart(2, '0');
      const paddedMin = String(min).padStart(2, '0');
      att.checkOut = dayjs.tz(checkoutDay + ' ' + paddedHour + ':' + paddedMin + ':00', 'Asia/Karachi').toDate();

      att.manualCheckout = true;
      att.autoCheckout = false;

      // End open breaks
      if (att.lunchBreakStart && !att.lunchBreakEnd) att.lunchBreakEnd = att.checkOut;
      const lb = att.shortBreaks?.[att.shortBreaks.length - 1];
      if (lb && lb.start && !lb.end) lb.end = att.checkOut;

      // Recalculate hours
      const totalMin = dayjs(att.checkOut).diff(dayjs(att.checkIn), 'minute');
      let breakMin = 0;
      if (att.lunchBreakStart && att.lunchBreakEnd) breakMin += dayjs(att.lunchBreakEnd).diff(dayjs(att.lunchBreakStart), 'minute');
      for (const b of att.shortBreaks || []) {
        if (b.start && b.end) breakMin += dayjs(b.end).diff(dayjs(b.start), 'minute');
      }
      att.totalWorkingHours = Math.max(0, (totalMin - breakMin) / 60);
      att.totalBreakHours = breakMin / 60;

      await att.save();
      updated++;
    }

    // Mark request completed
    req.status = 'completed';
    req.remarks = remarks || '';
    req.completedBy = userId;
    req.completedAt = new Date();
    req.dates = dates.map(d => ({ date: d.date, checkIn: d.checkIn, checkoutTime: d.checkoutTime || '3:00 AM' }));
    await req.save();

    // Notify admin
    const admins = await User.find({ role: 'admin', isActive: true });
    const emp = await User.findById(req.employeeId);
    for (const admin of admins) {
      await Notification.create({
        userId: admin._id, type: 'task-approved', title: 'Checkout Times Submitted',
        message: `${emp?.name}: ${updated} checkout times filled by ${role}`,
        relatedId: req._id,
      });
    }

    return NextResponse.json({ message: `${updated} attendance records updated`, request: req });
  } catch (error) {
    console.error('Submit checkout times error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
