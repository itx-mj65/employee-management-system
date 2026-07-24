import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Leave from '@/models/Leave';
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
    if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const body = await request.json();

    if (body.action === 'reset-password' && body.password) {
      if (body.password.length < 6) return NextResponse.json({ error: 'Min 6 characters' }, { status: 400 });
      const hashed = await hashPassword(body.password);
      await User.findByIdAndUpdate(id, { password: hashed });
      return NextResponse.json({ message: 'Password reset successfully' });
    }

    if (body.action === 'toggle-status') {
      const user = await User.findById(id);
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
      user.isActive = !user.isActive;
      await user.save();

      // Auto-reject pending leaves if disabled
      if (!user.isActive) {
        await Leave.updateMany(
          { userId: id, status: 'pending' },
          { status: 'rejected', adminRemarks: 'Account disabled' }
        );
      }

      return NextResponse.json({ message: `User ${user.isActive ? 'enabled' : 'disabled'}` });
    }

    // Regular update — sanitize inputs
    const { name, email, department, position, phone, role: userRole } = body;
    if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    if (!email?.trim()) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

    // Check email uniqueness
    const existing = await User.findOne({ email: email.toLowerCase().trim(), _id: { $ne: id } });
    if (existing) return NextResponse.json({ error: 'Email already in use' }, { status: 400 });

    const user = await User.findByIdAndUpdate(
      id,
      {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        department: department?.trim() || '',
        position: position?.trim() || '',
        phone: phone?.trim() || '',
        role: userRole || 'employee',
      },
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
    if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const user = await User.findById(id);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Prevent deleting yourself
    const adminId = request.headers.get('x-user-id');
    if (id === adminId) return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });

    await User.findByIdAndDelete(id);
    return NextResponse.json({ message: 'User deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
