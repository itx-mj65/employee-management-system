import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getUser } from '@/lib/api';
import Task from '@/models/Task';
import User from '@/models/User';
import Notification from '@/models/Notification';

const MAX_DAILY_SECONDS = 7 * 3600; // 7 hours per day

function calcElapsed(task) {
  if (!task.timerStartedAt) return task.productiveSeconds || 0;
  const elapsed = Math.floor((Date.now() - new Date(task.timerStartedAt).getTime()) / 1000);
  return (task.productiveSeconds || 0) + Math.max(0, elapsed);
}

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const task = await Task.findById(id)
      .populate('userId', 'name email department')
      .populate('assignedBy', 'name')
      .populate('approvalChain.userId', 'name').lean();
    if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    task.currentProductiveSeconds = calcElapsed(task);
    return NextResponse.json({ task });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const { userId, role, name } = getUser(request);
    const task = await Task.findById(id);
    if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await request.json();
    const { action, remarks } = body;

    if (action === 'accept') {
      if (task.userId.toString() !== userId) return NextResponse.json({ error: 'Not your task' }, { status: 403 });
      if (task.status !== 'assigned' && task.status !== 'returned') return NextResponse.json({ error: 'Cannot accept this task' }, { status: 400 });

      // Pause any other accepted task for this user
      const activeTasks = await Task.find({ userId, timerStartedAt: { $ne: null }, _id: { $ne: id } });
      for (const at of activeTasks) {
        const elapsed = Math.floor((Date.now() - new Date(at.timerStartedAt).getTime()) / 1000);
        at.productiveSeconds = (at.productiveSeconds || 0) + Math.max(0, elapsed);
        at.timeLog.push({ start: at.timerStartedAt, end: new Date() });
        at.timerStartedAt = null;
        await at.save();
      }

      task.status = 'accepted';
      task.timerStartedAt = new Date();
      task.timeLog.push({ start: new Date() });
      await task.save();
      return NextResponse.json({ task, message: 'Task accepted — timer started' });
    }

    if (action === 'submit') {
      if (task.userId.toString() !== userId) return NextResponse.json({ error: 'Not your task' }, { status: 403 });
      if (!['accepted', 'returned'].includes(task.status)) return NextResponse.json({ error: 'Accept the task first' }, { status: 400 });

      // Stop timer
      if (task.timerStartedAt) {
        const elapsed = Math.floor((Date.now() - new Date(task.timerStartedAt).getTime()) / 1000);
        task.productiveSeconds = (task.productiveSeconds || 0) + Math.max(0, elapsed);
        const lastLog = task.timeLog[task.timeLog.length - 1];
        if (lastLog && !lastLog.end) lastLog.end = new Date();
        task.timerStartedAt = null;
      }

      task.status = 'submitted';
      task.approvalChain.push({ userId, role, action: 'submitted', remarks: remarks || '', timestamp: new Date() });
      await task.save();

      // Notify assignedBy
      if (task.assignedBy) {
        await Notification.create({
          userId: task.assignedBy, type: 'task-approved',
          title: 'Task Submitted',
          message: `${name} submitted "${task.title}" for approval (${formatTime(task.productiveSeconds)})`,
          relatedId: task._id,
        });
      }
      return NextResponse.json({ task, message: 'Submitted for approval — timer stopped' });
    }

    if (action === 'return') {
      if (!['admin', 'manager', 'team-lead'].includes(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      if (task.status !== 'submitted') return NextResponse.json({ error: 'Task not submitted' }, { status: 400 });

      task.status = 'returned';
      task.timerStartedAt = new Date(); // Resume timer
      task.timeLog.push({ start: new Date() });
      task.approvalChain.push({ userId, role, action: 'returned', remarks: remarks || 'Needs improvement', timestamp: new Date() });
      await task.save();

      await Notification.create({
        userId: task.userId, type: 'announcement',
        title: 'Task Returned',
        message: `${name} returned "${task.title}": ${remarks || 'Needs improvement'}`,
        relatedId: task._id,
      });
      return NextResponse.json({ task, message: 'Returned — timer resumed' });
    }

    if (action === 'approve') {
      if (!['admin', 'manager', 'team-lead'].includes(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      if (task.status !== 'submitted') return NextResponse.json({ error: 'Task not submitted' }, { status: 400 });

      const adjustHours = parseFloat(body.adjustHours || 0);
      if (adjustHours) task.productiveSeconds += Math.round(adjustHours * 3600);
      task.productiveSeconds = Math.max(0, task.productiveSeconds);

      task.status = 'approved';
      task.timerStartedAt = null;
      task.approvalChain.push({ userId, role, action: 'approved', remarks: remarks || '', timestamp: new Date() });
      await task.save();

      await Notification.create({
        userId: task.userId, type: 'task-approved',
        title: 'Task Approved ✓',
        message: `${name} approved "${task.title}" — ${formatTime(task.productiveSeconds)} productive`,
        relatedId: task._id,
      });
      return NextResponse.json({ task, message: 'Approved' });
    }

    if (action === 'reject') {
      if (!['admin', 'manager', 'team-lead'].includes(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      task.status = 'rejected';
      task.timerStartedAt = null;
      const lastLog = task.timeLog[task.timeLog.length - 1];
      if (lastLog && !lastLog.end) lastLog.end = new Date();
      task.approvalChain.push({ userId, role, action: 'rejected', remarks: remarks || '', timestamp: new Date() });
      await task.save();
      return NextResponse.json({ task, message: 'Rejected' });
    }

    // Edit task (TL/Manager/Admin only for non-accepted tasks)
    if (!['admin', 'manager', 'team-lead'].includes(role) && task.userId.toString() !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (body.title) task.title = body.title.trim();
    if (body.description !== undefined) task.description = body.description.trim();
    if (body.priority) task.priority = body.priority;
    if (body.deadline !== undefined) task.deadline = body.deadline || null;
    await task.save();
    return NextResponse.json({ task, message: 'Updated' });
  } catch (error) {
    console.error('Task PUT error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const { role, userId } = getUser(request);
    if (!['admin', 'team-lead'].includes(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const task = await Task.findById(id);
    if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (role === 'team-lead') {
      const me = await User.findById(userId).lean();
      const emp = await User.findById(task.userId).lean();
      if (emp?.department !== me?.department) return NextResponse.json({ error: 'Not your department' }, { status: 403 });
    }
    await Task.findByIdAndDelete(id);
    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}
