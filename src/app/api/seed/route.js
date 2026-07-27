import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Department from '@/models/Department';
import Task from '@/models/Task';
import TaskComment from '@/models/TaskComment';
import DailyTaskList from '@/models/DailyTaskList';
import Attendance from '@/models/Attendance';
import Notification from '@/models/Notification';
import Announcement from '@/models/Announcement';
import Leave from '@/models/Leave';
import MonthlyRemark from '@/models/MonthlyRemark';
import CompanyHoliday from '@/models/CompanyHoliday';
import Otp from '@/models/Otp';
import { hashPassword } from '@/lib/auth';

export async function POST(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'reset') {
      await Promise.all([
        User.deleteMany({}), Department.deleteMany({}), Task.deleteMany({}),
        TaskComment.deleteMany({}), DailyTaskList.deleteMany({}), Attendance.deleteMany({}),
        Notification.deleteMany({}), Announcement.deleteMany({}), Leave.deleteMany({}),
        MonthlyRemark.deleteMany({}), CompanyHoliday.deleteMany({}), Otp.deleteMany({}),
      ]);
      return NextResponse.json({ message: 'Database wiped' });
    }

    const pw = await hashPassword('Pass123');

    for (const name of ['Marketing', 'Operations']) {
      if (!(await Department.findOne({ name }))) await Department.create({ name, breakSlots: 1, shortBreakDuration: 15 });
    }

    if (!(await User.findOne({ email: 'admin@medbillingrcm.com' }))) {
      await User.create({ name: 'Admin', email: 'admin@medbillingrcm.com', password: pw, role: 'admin', department: 'Operations', position: 'System Admin' });
    }

    return NextResponse.json({ message: 'Done', login: { email: 'admin@medbillingrcm.com', password: 'Pass123' }, departments: ['Marketing', 'Operations'] });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
