import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { hashPassword } from '@/lib/auth';

export async function POST() {
  try {
    await connectDB();

    const adminPassword = await hashPassword('admin123');
    const empPassword = await hashPassword('emp123');

    const users = [
      {
        name: 'Admin',
        email: 'admin@ems.com',
        password: adminPassword,
        role: 'admin',
        department: 'Management',
        position: 'System Admin',
        isActive: true,
      },
      {
        name: 'John Doe',
        email: 'john@ems.com',
        password: empPassword,
        role: 'employee',
        department: 'Engineering',
        position: 'Developer',
        isActive: true,
      },
      {
        name: 'Jane Smith',
        email: 'jane@ems.com',
        password: empPassword,
        role: 'employee',
        department: 'Design',
        position: 'UI Designer',
        isActive: true,
      },
    ];

    const results = [];

    for (const userData of users) {
      try {
        const exists = await User.findOne({ email: userData.email });
        if (exists) {
          results.push({ email: userData.email, status: 'already exists' });
        } else {
          await User.create(userData);
          results.push({ email: userData.email, status: 'created' });
        }
      } catch (err) {
        results.push({ email: userData.email, status: 'error', message: err.message });
      }
    }

    return NextResponse.json({
      message: 'Seed complete',
      results,
      credentials: {
        admin: 'admin@ems.com / admin123',
        employee1: 'john@ems.com / emp123',
        employee2: 'jane@ems.com / emp123',
      },
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
