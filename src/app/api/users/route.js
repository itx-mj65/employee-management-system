import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getUser } from '@/lib/api';
import User from '@/models/User';
import { hashPassword } from '@/lib/auth';

export async function GET(request) {
  try {
    await connectDB();
    const { role } = getUser(request);

    // Only admin, manager, team-lead can list users
    if (!['admin', 'manager', 'team-lead'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const roleFilter = searchParams.get('role') || '';
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '200');

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (roleFilter) query.role = roleFilter;
    if (status === 'active') query.isActive = true;
    if (status === 'disabled') query.isActive = false;

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({ users, pagination: { total, page, limit } });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const { role } = getUser(request);
    if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { name, email, password, department, position, phone, role: userRole } = body;

    if (!name?.trim() || !email?.trim() || !password) {
      return NextResponse.json({ error: 'Name, email, and password required' }, { status: 400 });
    }
    if (password.length < 6) return NextResponse.json({ error: 'Password min 6 chars' }, { status: 400 });

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) return NextResponse.json({ error: 'Email already in use' }, { status: 400 });

    const hashed = await hashPassword(password);
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashed,
      department: department?.trim() || '',
      position: position?.trim() || '',
      phone: phone?.trim() || '',
      role: userRole || 'employee',
    });

    const safe = user.toObject();
    delete safe.password;
    return NextResponse.json({ user: safe, message: 'User created' }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
