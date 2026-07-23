import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { hashPassword } from '@/lib/auth';

export async function POST() {
  try {
    await connectDB();

    const adminExists = await User.findOne({ email: 'admin@ems.com' });
    if (adminExists) {
      return NextResponse.json({ message: 'Seed data already exists' });
    }

    const adminPassword = await hashPassword('admin123');
    const empPassword = await hashPassword('emp123');

    await User.create([
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
    ]);

    return NextResponse.json({ message: 'Seed data created. Admin: admin@ems.com / admin123' });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
