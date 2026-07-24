import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Department from '@/models/Department';
import { hashPassword } from '@/lib/auth';

export async function POST() {
  try {
    await connectDB();
    const pw = await hashPassword('Pass123');

    // Create departments if they don't exist
    const deptNames = ['Engineering', 'Design', 'Operations', 'Marketing', 'HR'];
    const deptResults = [];
    for (const name of deptNames) {
      const exists = await Department.findOne({ name });
      if (exists) { deptResults.push({ name, status: 'exists' }); }
      else { await Department.create({ name, breakSlots: 1, shortBreakDuration: 15 }); deptResults.push({ name, status: 'created' }); }
    }

    // Create users if they don't exist
    const users = [
      { name: 'Admin', email: 'admin@ems.com', password: pw, role: 'admin', department: 'Operations', position: 'System Admin' },
      { name: 'Sarah Manager', email: 'sarah@ems.com', password: pw, role: 'manager', department: 'Operations', position: 'Operations Manager' },
      { name: 'Mike TL', email: 'mike@ems.com', password: pw, role: 'team-lead', department: 'Engineering', position: 'Tech Lead' },
      { name: 'John Doe', email: 'john@ems.com', password: pw, role: 'employee', department: 'Engineering', position: 'Developer' },
      { name: 'Jane Smith', email: 'jane@ems.com', password: pw, role: 'employee', department: 'Design', position: 'Designer' },
    ];

    const userResults = [];
    for (const u of users) {
      try {
        const exists = await User.findOne({ email: u.email });
        if (exists) { userResults.push({ email: u.email, status: 'exists' }); }
        else { await User.create(u); userResults.push({ email: u.email, status: 'created' }); }
      } catch (err) { userResults.push({ email: u.email, status: 'error', msg: err.message }); }
    }

    return NextResponse.json({
      message: 'Seed complete. Password for new accounts: Pass123',
      departments: deptResults,
      users: userResults,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
