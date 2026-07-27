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

    // === FULL WIPE: POST /api/seed?action=reset ===
    if (action === 'reset') {
      await Promise.all([
        User.deleteMany({}),
        Department.deleteMany({}),
        Task.deleteMany({}),
        TaskComment.deleteMany({}),
        DailyTaskList.deleteMany({}),
        Attendance.deleteMany({}),
        Notification.deleteMany({}),
        Announcement.deleteMany({}),
        Leave.deleteMany({}),
        MonthlyRemark.deleteMany({}),
        CompanyHoliday.deleteMany({}),
        Otp.deleteMany({}),
      ]);

      return NextResponse.json({
        message: 'Database completely wiped — all 12 collections cleared',
        cleared: ['Users','Departments','Tasks','Comments','DailyTasks','Attendance','Notifications','Announcements','Leaves','MonthlyRemarks','Holidays','OTPs'],
      });
    }

    // === DEFAULT: create if not exists ===
    const pw = await hashPassword('Pass123');

    const deptNames = ['Engineering', 'Design', 'Operations', 'Marketing', 'HR'];
    const deptResults = [];
    for (const name of deptNames) {
      const exists = await Department.findOne({ name });
      if (exists) deptResults.push({ name, status: 'exists' });
      else { await Department.create({ name, breakSlots: 1, shortBreakDuration: 15 }); deptResults.push({ name, status: 'created' }); }
    }

    const users = [
      { name: 'Admin', email: 'admin@ems.com', password: pw, role: 'admin', department: 'Operations', position: 'System Admin' },
      { name: 'Sarah Manager', email: 'sarah@ems.com', password: pw, role: 'manager', department: 'Operations', position: 'Operations Manager' },
      { name: 'Mike TL', email: 'mike@ems.com', password: pw, role: 'team-lead', department: 'Engineering', position: 'Tech Lead' },
      { name: 'John Doe', email: 'john@ems.com', password: pw, role: 'employee', department: 'Engineering', position: 'Developer' },
      { name: 'Jane Smith', email: 'jane@ems.com', password: pw, role: 'employee', department: 'Design', position: 'Designer' },
    ];

    const userResults = [];
    for (const u of users) {
      const exists = await User.findOne({ email: u.email });
      if (exists) userResults.push({ email: u.email, status: 'exists' });
      else { await User.create(u); userResults.push({ email: u.email, status: 'created' }); }
    }

    return NextResponse.json({ message: 'Seed complete. Password: Pass123', departments: deptResults, users: userResults });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
