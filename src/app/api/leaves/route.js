import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Leave from '@/models/Leave';
import Notification from '@/models/Notification';
import User from '@/models/User';
import dayjs from 'dayjs';

export async function GET(request) {
  try {
    await connectDB();
    const userId = request.headers.get('x-user-id');
    const role = request.headers.get('x-user-role');
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const employeeId = searchParams.get('employeeId');

    const query = {};
    if (role === 'admin') {
      if (employeeId && employeeId !== 'all') query.userId = employeeId;
    } else {
      query.userId = userId;
    }
    if (status && status !== 'all') query.status = status;

    const leaves = await Leave.find(query)
      .populate('userId', 'name email department position')
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(100);

    // Stats
    const myQuery = role === 'admin' && employeeId && employeeId !== 'all' 
      ? { userId: employeeId } 
      : role !== 'admin' ? { userId } : {};
    
    const year = dayjs().year();
    const yearStart = dayjs(`${year}-01-01`).toDate();
    const yearEnd = dayjs(`${year}-12-31`).toDate();
    const yearLeaves = await Leave.find({ 
      ...myQuery, 
      status: 'approved',
      startDate: { $gte: yearStart, $lte: yearEnd }
    });

    const stats = {
      totalApproved: yearLeaves.reduce((s, l) => s + l.totalDays, 0),
      sick: yearLeaves.filter(l => l.type === 'sick').reduce((s, l) => s + l.totalDays, 0),
      casual: yearLeaves.filter(l => l.type === 'casual').reduce((s, l) => s + l.totalDays, 0),
      annual: yearLeaves.filter(l => l.type === 'annual').reduce((s, l) => s + l.totalDays, 0),
      pending: await Leave.countDocuments({ ...myQuery, status: 'pending' }),
    };

    // For admin: count all pending
    if (role === 'admin') {
      stats.allPending = await Leave.countDocuments({ status: 'pending' });
    }

    return NextResponse.json({ leaves, stats });
  } catch (error) {
    console.error('Get leaves error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const userId = request.headers.get('x-user-id');
    const userName = request.headers.get('x-user-name');
    const { type, startDate, endDate, reason } = await request.json();

    if (!type || !startDate || !endDate || !reason?.trim()) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const validTypes = ['sick', 'casual', 'annual', 'emergency', 'unpaid', 'other'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid leave type' }, { status: 400 });
    }

    // Validate dates
    if (!dayjs(startDate).isValid() || !dayjs(endDate).isValid()) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    const start = dayjs(startDate).startOf('day');
    const end = dayjs(endDate).startOf('day');

    if (end.isBefore(start)) {
      return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 });
    }

    if (start.isBefore(dayjs().startOf('day'))) {
      return NextResponse.json({ error: 'Cannot request leave for past dates' }, { status: 400 });
    }

    // Calculate working days (exclude weekends)
    let totalDays = 0;
    let d = start;
    while (d.isBefore(end) || d.isSame(end, 'day')) {
      if (d.day() !== 0 && d.day() !== 6) totalDays++;
      d = d.add(1, 'day');
    }

    if (totalDays === 0) {
      return NextResponse.json({ error: 'Selected dates fall on weekends only' }, { status: 400 });
    }

    // Check for overlapping leaves
    const overlap = await Leave.findOne({
      userId,
      status: { $ne: 'rejected' },
      $or: [
        { startDate: { $lte: end.toDate() }, endDate: { $gte: start.toDate() } },
      ],
    });

    if (overlap) {
      return NextResponse.json({ error: 'You already have a leave request for these dates' }, { status: 400 });
    }

    const leave = await Leave.create({
      userId,
      type,
      startDate: start.toDate(),
      endDate: end.toDate(),
      totalDays,
      reason: reason.trim(),
    });

    // Notify admins
    const admins = await User.find({ role: 'admin' });
    const notifications = admins.map(admin => ({
      userId: admin._id,
      type: 'announcement',
      title: 'Leave Request',
      message: `${userName || 'Employee'} requested ${totalDays} day${totalDays > 1 ? 's' : ''} ${type} leave (${start.format('MMM D')} — ${end.format('MMM D')})`,
      relatedId: leave._id,
    }));
    await Notification.insertMany(notifications);

    const populated = await Leave.findById(leave._id)
      .populate('userId', 'name email department');

    return NextResponse.json({ leave: populated, message: 'Leave request submitted' }, { status: 201 });
  } catch (error) {
    console.error('Create leave error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
