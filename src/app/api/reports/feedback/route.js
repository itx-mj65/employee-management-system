import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getUser } from '@/lib/api';
import DailyReport from '@/models/DailyReport';
import Notification from '@/models/Notification';
import User from '@/models/User';

export async function POST(request) {
  try {
    await connectDB();
    const { userId, role, name } = getUser(request);
    if (!['admin', 'manager', 'team-lead'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { reportId, feedback } = await request.json();
    if (!feedback?.trim()) return NextResponse.json({ error: 'Feedback required' }, { status: 400 });

    const report = await DailyReport.findById(reportId);
    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });

    report.feedback = feedback.trim();
    report.feedbackBy = userId;
    report.feedbackAt = new Date();
    await report.save();

    // Notify employee
    await Notification.create({
      userId: report.userId,
      type: 'announcement',
      title: 'Report Feedback',
      message: `${name} gave feedback on your daily report`,
      relatedId: report._id,
    });

    const populated = await DailyReport.findById(reportId)
      .populate('userId', 'name')
      .populate('feedbackBy', 'name')
      .lean();

    return NextResponse.json({ report: populated, message: 'Feedback submitted' });
  } catch (error) {
    console.error('Feedback error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
