import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { hashPassword } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const user = await User.findById(id);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    await connectDB();
    const role = request.headers.get('x-user-role');
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    // Handle reset password (explicit action)
    if (body.action === 'reset-password' && body.password) {
      const hashed = await hashPassword(body.password);
      await User.findByIdAndUpdate(id, { password: hashed });
      return NextResponse.json({ message: 'Password reset successfully' });
    }

    // Handle toggle status (explicit action)
    if (body.action === 'toggle-status') {
      const user = await User.findById(id);
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
      user.isActive = !user.isActive;
      await user.save();
      return NextResponse.json({ message: `User ${user.isActive ? 'enabled' : 'disabled'}` });
    }

    // Regular update - only pick safe fields
    const { name, email, department, position, phone, role: userRole } = body;
    const user = await User.findByIdAndUpdate(
      id,
      { name, email, department, position, phone, role: userRole },
      { new: true, runValidators: true }
    );

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json({ user, message: 'User updated' });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectDB();
    const role = request.headers.get('x-user-role');
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    await User.findByIdAndDelete(id);
    return NextResponse.json({ message: 'User deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
