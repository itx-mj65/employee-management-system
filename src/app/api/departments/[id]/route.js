import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getUser } from '@/lib/api';
import Department from '@/models/Department';

export async function PUT(request, { params }) {
  try {
    await connectDB();
    const { isAdmin } = getUser(request);
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const body = await request.json();

    if (body.action === 'toggle') {
      const dept = await Department.findById(id);
      if (!dept) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      dept.isActive = !dept.isActive;
      await dept.save();
      return NextResponse.json({ department: dept, message: `Department ${dept.isActive ? 'activated' : 'deactivated'}` });
    }

    const { name, description, head, breakSlots, shortBreakDuration } = body;
    const dept = await Department.findByIdAndUpdate(id, {
      ...(name && { name: name.trim() }),
      ...(description !== undefined && { description: description.trim() }),
      ...(head !== undefined && { head: head || null }),
      ...(breakSlots !== undefined && { breakSlots }),
      ...(shortBreakDuration !== undefined && { shortBreakDuration }),
    }, { new: true }).populate('head', 'name email');

    if (!dept) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ department: dept, message: 'Updated' });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectDB();
    const { isAdmin } = getUser(request);
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { id } = await params;
    await Department.findByIdAndDelete(id);
    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
