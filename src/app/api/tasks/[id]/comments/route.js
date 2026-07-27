import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import TaskComment from '@/models/TaskComment';
import Task from '@/models/Task';
import Notification from '@/models/Notification';
import User from '@/models/User';

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const comments = await TaskComment.find({ taskId: id })
      .populate('userId', 'name email')
      .sort({ createdAt: 1 })
      .lean();
    return NextResponse.json({ comments });
  } catch (error) {
    console.error('Get comments error:', error);
    return NextResponse.json({ comments: [] });
  }
}

export async function POST(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const userId = request.headers.get('x-user-id');
    const userName = request.headers.get('x-user-name');
    const { content } = await request.json();

    if (!content?.trim()) return NextResponse.json({ error: 'Comment required' }, { status: 400 });

    const task = await Task.findById(id).populate('userId', 'name department').lean();
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    const comment = await TaskComment.create({ taskId: id, userId, content: content.trim() });
    const populated = await TaskComment.findById(comment._id).populate('userId', 'name email').lean();

    // Notify: task creator + assignee + department TL + department manager + admin
    try {
      const dept = task.userId?.department || '';
      const notifyIds = new Set();

      // Task creator and assignee
      const creatorId = task.userId?._id?.toString() || task.userId?.toString();
      if (creatorId && creatorId !== userId) notifyIds.add(creatorId);
      if (task.assignedTo && task.assignedTo.toString() !== userId) notifyIds.add(task.assignedTo.toString());

      // Department supervisors + admin
      if (dept) {
        const supervisors = await User.find({
          isActive: true,
          _id: { $ne: userId },
          $or: [
            { role: 'admin' },
            { role: 'manager', department: dept },
            { role: 'team-lead', department: dept },
          ],
        }).select('_id').lean();
        supervisors.forEach(s => notifyIds.add(s._id.toString()));
      }

      const notifs = [...notifyIds].map(uid => ({
        userId: uid, type: 'new-comment', title: 'New Comment',
        message: `${userName || 'Someone'} commented on "${task.title}"`,
        relatedId: task._id,
      }));
      if (notifs.length > 0) await Notification.insertMany(notifs);
    } catch (e) { console.error('Comment notification error:', e); }

    return NextResponse.json({ comment: populated }, { status: 201 });
  } catch (error) {
    console.error('Add comment error:', error);
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
  }
}
