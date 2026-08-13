import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getUser } from '@/lib/api';
import TaskComment from '@/models/TaskComment';
import Task from '@/models/Task';
import Notification from '@/models/Notification';
import User from '@/models/User';

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const comments = await TaskComment.find({ taskId: id })
      .populate('userId', 'name email department')
      .sort({ createdAt: 1 })
      .lean();
    return NextResponse.json({ comments });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const { userId, name } = getUser(request);
    const { content } = await request.json();
    if (!content?.trim()) return NextResponse.json({ error: 'Content required' }, { status: 400 });

    const comment = await TaskComment.create({ taskId: id, userId, content: content.trim() });
    const populated = await TaskComment.findById(comment._id).populate('userId', 'name email department').lean();

    // Update task comment count
    await Task.findByIdAndUpdate(id, { $inc: { commentCount: 1 } });

    return NextResponse.json({ comment: populated, message: 'Comment added' }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const { userId } = getUser(request);
    const { commentId, content } = await request.json();
    if (!content?.trim()) return NextResponse.json({ error: 'Content required' }, { status: 400 });

    const comment = await TaskComment.findById(commentId);
    if (!comment) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (comment.userId.toString() !== userId) return NextResponse.json({ error: 'Can only edit your own comments' }, { status: 403 });

    comment.content = content.trim();
    comment.edited = true;
    comment.editedAt = new Date();
    await comment.save();

    const populated = await TaskComment.findById(commentId).populate('userId', 'name').lean();
    return NextResponse.json({ comment: populated });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const { userId, role } = getUser(request);
    const { commentId } = await request.json();

    const comment = await TaskComment.findById(commentId);
    if (!comment) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (comment.userId.toString() !== userId && !['admin', 'manager', 'team-lead'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await TaskComment.findByIdAndDelete(commentId);
    await Task.findByIdAndUpdate(id, { $inc: { commentCount: -1 } });
    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
