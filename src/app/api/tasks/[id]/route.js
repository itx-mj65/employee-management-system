import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Task from '@/models/Task';
import Notification from '@/models/Notification';
import User from '@/models/User';

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const task = await Task.findById(id)
      .populate('userId', 'name email')
      .populate('assignedTo', 'name email')
      .populate('approvedBy', 'name');
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    return NextResponse.json({ task });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const userId = request.headers.get('x-user-id');
    const userName = request.headers.get('x-user-name');
    const role = request.headers.get('x-user-role');
    const body = await request.json();

    const task = await Task.findById(id);
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    // Handle status changes
    if (body.action === 'request-approval') {
      task.status = 'pending-approval';
      await task.save();

      // Notify admins
      const admins = await User.find({ role: 'admin' });
      const notifications = admins.map(admin => ({
        userId: admin._id,
        type: 'task-approved',
        title: 'Task Approval Requested',
        message: `${userName || 'Employee'} requested approval for: ${task.title}`,
        relatedId: task._id,
      }));
      await Notification.insertMany(notifications);

      return NextResponse.json({ task, message: 'Approval requested' });
    }

    if (body.action === 'approve' && role === 'admin') {
      task.status = 'approved';
      task.approvedBy = userId;
      task.approvedAt = new Date();
      task.completedAt = new Date();
      await task.save();

      // Notify task creator and assigned employee
      const notifyUsers = new Set();
      notifyUsers.add(task.userId.toString());
      if (task.assignedTo) notifyUsers.add(task.assignedTo.toString());
      notifyUsers.delete(userId); // Don't notify the admin who approved

      for (const uid of notifyUsers) {
        await Notification.create({
          userId: uid,
          type: 'task-approved',
          title: 'Task Approved',
          message: `Your task "${task.title}" has been approved.`,
          relatedId: task._id,
        });
      }

      return NextResponse.json({ task, message: 'Task approved' });
    }

    if (body.action === 'reject' && role === 'admin') {
      task.status = 'rejected';
      task.approvedBy = userId;
      task.approvedAt = new Date();
      await task.save();

      const notifyUsers = new Set();
      notifyUsers.add(task.userId.toString());
      if (task.assignedTo) notifyUsers.add(task.assignedTo.toString());
      notifyUsers.delete(userId);

      for (const uid of notifyUsers) {
        await Notification.create({
          userId: uid,
          type: 'task-rejected',
          title: 'Task Rejected',
          message: `Your task "${task.title}" has been rejected.`,
          relatedId: task._id,
        });
      }

      return NextResponse.json({ task, message: 'Task rejected' });
    }

    // Regular update
    if (role !== 'admin' && task.userId.toString() !== userId && task.assignedTo?.toString() !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const allowed = ['title', 'description', 'priority', 'status', 'expectedCompletionTime', 'assignedTo', 'deadline'];
    for (const key of allowed) {
      if (body[key] !== undefined) task[key] = body[key];
    }

    await task.save();
    const populated = await Task.findById(id)
      .populate('userId', 'name email')
      .populate('assignedTo', 'name email')
      .populate('approvedBy', 'name');

    return NextResponse.json({ task: populated, message: 'Task updated' });
  } catch (error) {
    console.error('Update task error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const role = request.headers.get('x-user-role');

    if (role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can delete tasks' }, { status: 403 });
    }

    const task = await Task.findById(id);
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    // Cascade: delete comments, remove from daily task list
    const TaskComment = (await import('@/models/TaskComment')).default;
    const DailyTaskList = (await import('@/models/DailyTaskList')).default;
    await Promise.all([
      TaskComment.deleteMany({ taskId: id }),
      DailyTaskList.updateMany({ tasks: id }, { $pull: { tasks: id } }),
      Task.findByIdAndDelete(id),
    ]);

    return NextResponse.json({ message: 'Task deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
