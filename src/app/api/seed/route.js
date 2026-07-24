import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Department from '@/models/Department';
import { hashPassword } from '@/lib/auth';

export async function POST() {
  try {
    await connectDB();
    const pw = await hashPassword('Pass123');

    // Create departments
    const depts = ['Engineering', 'Design', 'Operations', 'Marketing', 'HR'];
    for (const name of depts) {
      const exists = await Department.findOne({ name });
      if (!exists) await Department.create({ name, breakSlots: 1 });
    }

    const users = [
      { name: 'Admin', email: 'admin@ems.com', password: pw, role: 'admin', department: 'Operations', position: 'System Admin' },
      { name: 'Sarah Manager', email: 'sarah@ems.com', password: pw, role: 'manager', department: 'Operations', position: 'Operations Manager' },
      { name: 'Mike TL', email: 'mike@ems.com', password: pw, role: 'team-lead', department: 'Engineering', position: 'Tech Lead' },
      { name: 'John Doe', email: 'john@ems.com', password: pw, role: 'employee', department: 'Engineering', position: 'Developer' },
      { name: 'Jane Smith', email: 'jane@ems.com', password: pw, role: 'employee', department: 'Design', position: 'Designer' },
    ];

    const results = [];
    for (const u of users) {
      const exists = await User.findOne({ email: u.email });
      if (exists) {
        exists.role = u.role; exists.department = u.department; await exists.save();
        results.push({ email: u.email, status: 'updated' });
      } else {
        await User.create(u);
        results.push({ email: u.email, status: 'created' });
      }
    }

    return NextResponse.json({
      message: 'Seed complete. Password: Pass123',
      departments: depts,
      results,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
