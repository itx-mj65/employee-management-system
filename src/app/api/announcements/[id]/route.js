import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Announcement from '@/models/Announcement';

export async function PUT(request, { params }) {
  try {
    await connectDB();
    const role = request.headers.get('x-user-role');
    if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const body = await request.json();
    const announcement = await Announcement.findByIdAndUpdate(id, body, { new: true })
      .populate('createdBy', 'name');

    if (!announcement) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ announcement, message: 'Announcement updated' });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectDB();
    const role = request.headers.get('x-user-role');
    if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    await Announcement.findByIdAndDelete(id);
    return NextResponse.json({ message: 'Announcement deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
