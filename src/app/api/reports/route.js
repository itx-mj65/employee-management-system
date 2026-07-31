import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getUser } from '@/lib/api';
import DailyReport from '@/models/DailyReport';
import ReportSetting from '@/models/ReportSetting';
import User from '@/models/User';
import { workToday, dayjs } from '@/lib/date';

export async function GET(request) {
  try {
    await connectDB();
    const { userId, role } = getUser(request);
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const empFilter = searchParams.get('employeeId') || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Auto-cleanup: delete reports older than 30 days
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await DailyReport.deleteMany({ createdAt: { $lt: cutoff } });

    const query = {};
    
    if (role === 'admin') {
      if (empFilter !== 'all') query.userId = empFilter;
    } else if (role === 'manager' || role === 'team-lead') {
      const me = await User.findById(userId);
      const deptUsers = await User.find({ department: me?.department, isActive: true }).select('_id');
      const deptIds = deptUsers.map(u => u._id);
      if (empFilter !== 'all') {
        query.userId = empFilter;
      } else {
        query.userId = { $in: deptIds };
      }
    } else {
      query.userId = userId;
    }

    if (date) {
      const d = dayjs(date).startOf('day');
      query.date = { $gte: d.toDate(), $lte: d.endOf('day').toDate() };
    }

    const total = await DailyReport.countDocuments(query);
    const reports = await DailyReport.find(query)
      .populate('userId', 'name email department')
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Check if current user needs to submit today
    const today = workToday();
    const me = await User.findById(userId);
    const setting = await ReportSetting.findOne({ department: me?.department, isActive: true });
    let mustSubmit = false;
    if (setting) {
      if (setting.mode === 'all') {
        mustSubmit = true;
      } else {
        mustSubmit = setting.specificUsers.some(id => id.toString() === userId);
      }
    }
    const todayReport = await DailyReport.findOne({ userId, date: today });
    const submitted = !!todayReport;

    return NextResponse.json({
      reports, 
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      todayStatus: { mustSubmit, submitted },
    });
  } catch (error) {
    console.error('Reports error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const { userId } = getUser(request);
    const { tasksCompleted, planTomorrow, remarks } = await request.json();

    if (!tasksCompleted?.trim()) {
      return NextResponse.json({ error: 'Tasks completed is required' }, { status: 400 });
    }

    const today = workToday();
    const existing = await DailyReport.findOne({ userId, date: today });
    if (existing) {
      return NextResponse.json({ error: 'Report already submitted for today' }, { status: 400 });
    }

    const report = await DailyReport.create({
      userId, date: today,
      tasksCompleted: tasksCompleted.trim(),
      planTomorrow: planTomorrow?.trim() || '',
      remarks: remarks?.trim() || '',
    });

    const populated = await DailyReport.findById(report._id).populate('userId', 'name department').lean();
    return NextResponse.json({ report: populated, message: 'Report submitted' }, { status: 201 });
  } catch (error) {
    console.error('Submit report error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
