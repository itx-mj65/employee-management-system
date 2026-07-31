import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Notification from '@/models/Notification';

export async function GET(request) {
  try {
    await connectDB();
    const userId = request.headers.get('x-user-id');
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '30');

    // Auto-cleanup: delete notifications older than 15 days
    const cutoff = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
    await Notification.deleteMany({ userId, createdAt: { $lt: cutoff } });

    const [total, notifications, unreadCount] = await Promise.all([
      Notification.countDocuments({ userId }),
      Notification.find({ userId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Notification.countDocuments({ userId, isRead: false }),
    ]);

    return NextResponse.json({ 
      notifications, unreadCount, 
      pagination: { total, page, limit, pages: Math.ceil(total / limit) } 
    });
  } catch (error) {
    return NextResponse.json({ notifications: [], unreadCount: 0, pagination: { total: 0, page: 1, pages: 0 } });
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
