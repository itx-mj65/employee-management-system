import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Announcement from '@/models/Announcement';
import Notification from '@/models/Notification';
import User from '@/models/User';

export async function GET() {
  try {
    await connectDB();
    const announcements = await Announcement.find({ isActive: true })
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    return NextResponse.json({ announcements });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const role = request.headers.get('x-user-role');
    const userId = request.headers.get('x-user-id');

    if (role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { title, content } = await request.json();
    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content required' }, { status: 400 });
    }

    const announcement = await Announcement.create({ title, content, createdBy: userId });

    // Notify all employees
    const employees = await User.find({ role: 'employee', isActive: true });
    const notifications = employees.map(emp => ({
      userId: emp._id,
      type: 'announcement',
      title: 'New Announcement',
      message: title,
      relatedId: announcement._id,
    }));
    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    const populated = await Announcement.findById(announcement._id).populate('createdBy', 'name');
    return NextResponse.json({ announcement: populated, message: 'Announcement created' }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
