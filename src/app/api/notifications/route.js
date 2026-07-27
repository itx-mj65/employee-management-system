import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Notification from '@/models/Notification';

export async function GET(request) {
  try {
    await connectDB();
    const userId = request.headers.get('x-user-id');

    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ userId })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      Notification.countDocuments({ userId, isRead: false }),
    ]);

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    return NextResponse.json({ notifications: [], unreadCount: 0 }, { status: 200 });
  }
}

export async function PUT(request) {
  try {
    await connectDB();
    const userId = request.headers.get('x-user-id');
    const { ids } = await request.json();

    if (ids === 'all') {
      await Notification.updateMany({ userId, isRead: false }, { isRead: true });
    } else if (Array.isArray(ids) && ids.length > 0) {
      await Notification.updateMany({ _id: { $in: ids }, userId }, { isRead: true });
    }

    return NextResponse.json({ message: 'Marked as read' });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
