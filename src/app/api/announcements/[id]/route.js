import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getUser } from '@/lib/api';
import Announcement from '@/models/Announcement';

export async function PUT(request, { params }) {
  try {
    await connectDB();
    const { userId, role } = getUser(request);
    if (!['admin', 'manager', 'team-lead'].includes(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const ann = await Announcement.findById(id);
    if (!ann) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // TL/Manager can only edit their own announcements
    if (role !== 'admin' && ann.createdBy?.toString() !== userId) {
      return NextResponse.json({ error: 'Can only edit your own announcements' }, { status: 403 });
    }

    const body = await request.json();
    const updated = await Announcement.findByIdAndUpdate(id, { title: body.title, content: body.content }, { new: true }).populate('createdBy', 'name');
    return NextResponse.json({ announcement: updated, message: 'Updated' });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectDB();
    const { userId, role } = getUser(request);
    if (!['admin', 'manager', 'team-lead'].includes(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const ann = await Announcement.findById(id);
    if (!ann) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // TL/Manager can only delete their own announcements
    if (role !== 'admin' && ann.createdBy?.toString() !== userId) {
      return NextResponse.json({ error: 'Can only delete your own announcements' }, { status: 403 });
    }

    await Announcement.findByIdAndDelete(id);
    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
