import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getUser } from '@/lib/api';
import Announcement from '@/models/Announcement';
import Notification from '@/models/Notification';
import User from '@/models/User';

export async function GET(request) {
  try {
    await connectDB();
    const { userId, role } = getUser(request);
    const user = await User.findById(userId);

    let query = { isActive: true };
    // Non-admin users see: all-company + their department announcements
    if (role !== 'admin') {
      query.$or = [{ department: '' }, { department: user?.department || '' }];
    }

    const announcements = await Announcement.find(query)
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
    const { role, userId, name } = getUser(request);
    if (role !== 'admin' && role !== 'manager') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { title, content, department } = await request.json();
    if (!title?.trim() || !content?.trim()) return NextResponse.json({ error: 'Title and content required' }, { status: 400 });

    const announcement = await Announcement.create({
      title: title.trim(), content: content.trim(),
      createdBy: userId,
      department: department?.trim() || '',
    });

    // Notify target employees
    const userQuery = { isActive: true, role: { $ne: 'admin' } };
    if (department && department !== 'all') userQuery.department = department;
    const employees = await User.find(userQuery);

    if (employees.length > 0) {
      await Notification.insertMany(employees.map(emp => ({
        userId: emp._id, type: 'announcement',
        title: 'New Announcement',
        message: `${department && department !== 'all' ? `[${department}] ` : ''}${title}`,
        relatedId: announcement._id,
      })));
    }

    const populated = await Announcement.findById(announcement._id).populate('createdBy', 'name');
    return NextResponse.json({ announcement: populated, message: 'Announcement posted' }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
