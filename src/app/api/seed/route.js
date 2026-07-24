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

export async function POST() {
  try {
    await connectDB();

    // ======== WIPE ALL COLLECTIONS ========
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

    // ======== CREATE DEPARTMENTS ========
    const deptNames = ['Engineering', 'Design', 'Operations', 'Marketing', 'HR'];
    const depts = [];
    for (const name of deptNames) {
      const d = await Department.create({ name, breakSlots: 1 });
      depts.push(d);
    }

    // ======== CREATE USERS ========
    const pw = await hashPassword('Pass123');

    const users = await User.create([
      { name: 'Admin', email: 'admin@ems.com', password: pw, role: 'admin', department: 'Operations', position: 'System Admin' },
      { name: 'Sarah Manager', email: 'sarah@ems.com', password: pw, role: 'manager', department: 'Operations', position: 'Operations Manager' },
      { name: 'Mike TL', email: 'mike@ems.com', password: pw, role: 'team-lead', department: 'Engineering', position: 'Tech Lead' },
      { name: 'John Doe', email: 'john@ems.com', password: pw, role: 'employee', department: 'Engineering', position: 'Developer' },
      { name: 'Jane Smith', email: 'jane@ems.com', password: pw, role: 'employee', department: 'Design', position: 'Designer' },
    ]);

    return NextResponse.json({
      message: 'Database wiped and reseeded successfully',
      password: 'Pass123',
      cleared: [
        'Users', 'Departments', 'Tasks', 'TaskComments', 'DailyTaskLists',
        'Attendance', 'Notifications', 'Announcements', 'Leaves',
        'MonthlyRemarks', 'CompanyHolidays', 'OTPs'
      ],
      departments: deptNames,
      users: users.map(u => ({ name: u.name, email: u.email, role: u.role, department: u.department })),
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
