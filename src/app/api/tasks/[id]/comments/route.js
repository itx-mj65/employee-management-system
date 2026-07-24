import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import TaskComment from '@/models/TaskComment';
import Task from '@/models/Task';
import Notification from '@/models/Notification';

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const comments = await TaskComment.find({ taskId: id })
      .populate('userId', 'name email avatar')
      .sort({ createdAt: 1 });
    return NextResponse.json({ comments });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const userId = request.headers.get('x-user-id');
    const userName = request.headers.get('x-user-name');
    const { content } = await request.json();

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Comment content required' }, { status: 400 });
    }

    const task = await Task.findById(id);
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    const comment = await TaskComment.create({ taskId: id, userId, content: content.trim() });
    const populated = await TaskComment.findById(comment._id)
      .populate('userId', 'name email avatar');

    // Notify task owner and assignee (if different from commenter)
    const notifyIds = new Set();
    if (task.userId.toString() !== userId) notifyIds.add(task.userId.toString());
    if (task.assignedTo && task.assignedTo.toString() !== userId) notifyIds.add(task.assignedTo.toString());

    for (const uid of notifyIds) {
      await Notification.create({
        userId: uid,
        type: 'new-comment',
        title: 'New Comment',
        message: `${userName || 'Someone'} commented on "${task.title}"`,
        relatedId: task._id,
      });
    }

    return NextResponse.json({ comment: populated, message: 'Comment added' }, { status: 201 });
  } catch (error) {
    console.error('Add comment error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
