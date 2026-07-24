import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { hashPassword } from '@/lib/auth';

export async function POST() {
  try {
    await connectDB();
    const pw = await hashPassword('Pass123');

    const users = [
      { name: 'Admin', email: 'admin@ems.com', password: pw, role: 'admin', department: 'Management', position: 'System Admin' },
      { name: 'Sarah Manager', email: 'sarah@ems.com', password: pw, role: 'manager', department: 'Operations', position: 'Operations Manager' },
      { name: 'Mike TL', email: 'mike@ems.com', password: pw, role: 'team-lead', department: 'Engineering', position: 'Tech Lead' },
      { name: 'John Doe', email: 'john@ems.com', password: pw, role: 'employee', department: 'Engineering', position: 'Developer' },
      { name: 'Jane Smith', email: 'jane@ems.com', password: pw, role: 'employee', department: 'Design', position: 'Designer' },
    ];

    const results = [];
    for (const u of users) {
      try {
        const exists = await User.findOne({ email: u.email });
        if (exists) {
          // Update role if it changed
          if (exists.role !== u.role) { exists.role = u.role; await exists.save(); results.push({ email: u.email, status: 'role updated' }); }
          else results.push({ email: u.email, status: 'exists' });
        } else {
          await User.create(u);
          results.push({ email: u.email, status: 'created' });
        }
      } catch (err) { results.push({ email: u.email, status: 'error', msg: err.message }); }
    }

    return NextResponse.json({
      message: 'Seed complete. Password for all: Pass123',
      results,
      roles: { admin: 'admin@ems.com', manager: 'sarah@ems.com', teamLead: 'mike@ems.com', employee: 'john@ems.com / jane@ems.com' },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
