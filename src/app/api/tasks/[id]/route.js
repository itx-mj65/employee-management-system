import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getUser } from '@/lib/api';
import Task from '@/models/Task';
import Notification from '@/models/Notification';
import User from '@/models/User';

const ROLE_LEVEL = { admin: 4, manager: 3, 'team-lead': 2, employee: 1 };

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const task = await Task.findById(id)
      .populate('userId', 'name email')
      .populate('assignedTo', 'name email')
      .populate('approvalChain.userId', 'name')
      .populate('rejectedBy', 'name');
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
    const { userId, role, name } = getUser(request);
    const body = await request.json();
    const task = await Task.findById(id);
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

    // === SUBMIT FOR APPROVAL ===
    if (body.action === 'submit-approval') {
      task.status = 'pending-tl';
      task.currentApprover = 'team-lead';
      await task.save();

      // Notify team leads
      const teamLeads = await User.find({ role: 'team-lead', isActive: true });
      if (teamLeads.length > 0) {
        await Notification.insertMany(teamLeads.map(tl => ({
          userId: tl._id, type: 'task-approved', title: 'Task Approval Needed',
          message: `${name} submitted "${task.title}" for approval`, relatedId: task._id,
        })));
      }
      return NextResponse.json({ task, message: 'Submitted to Team Lead' });
    }

    // === APPROVE ===
    if (body.action === 'approve') {
      if (ROLE_LEVEL[role] < 2) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

      task.approvalChain.push({ role, userId, action: 'approved', remarks: body.remarks || '', timestamp: new Date() });

      if (role === 'team-lead') {
        // TL approves → task proceeds to work
        task.status = 'approved';
        task.completedAt = new Date();
      } else if (role === 'manager') {
        task.status = 'approved';
        task.completedAt = new Date();
      } else if (role === 'admin') {
        task.status = 'approved';
        task.completedAt = new Date();
      }

      await task.save();

      // Notify task owner + assigned
      const notifyIds = new Set([task.userId.toString()]);
      if (task.assignedTo) notifyIds.add(task.assignedTo.toString());
      notifyIds.delete(userId);
      for (const uid of notifyIds) {
        await Notification.create({
          userId: uid, type: 'task-approved', title: 'Task Approved',
          message: `"${task.title}" approved by ${name} (${role})${body.remarks ? '. Remarks: ' + body.remarks : ''}`,
          relatedId: task._id,
        });
      }
      return NextResponse.json({ task, message: 'Task approved' });
    }

    // === REJECT ===
    if (body.action === 'reject') {
      if (ROLE_LEVEL[role] < 2) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
      if (!body.remarks?.trim()) return NextResponse.json({ error: 'Rejection remarks are required' }, { status: 400 });

      task.status = 'rejected';
      task.rejectedBy = userId;
      task.rejectionRemarks = body.remarks.trim();
      task.approvalChain.push({ role, userId, action: 'rejected', remarks: body.remarks.trim(), timestamp: new Date() });
      await task.save();

      const notifyIds = new Set([task.userId.toString()]);
      if (task.assignedTo) notifyIds.add(task.assignedTo.toString());
      notifyIds.delete(userId);
      for (const uid of notifyIds) {
        await Notification.create({
          userId: uid, type: 'task-rejected', title: 'Task Rejected',
          message: `"${task.title}" rejected by ${name} (${role}). Reason: ${body.remarks}`,
          relatedId: task._id,
        });
      }
      return NextResponse.json({ task, message: 'Task rejected' });
    }

    // === FORWARD TO MANAGER ===
    if (body.action === 'forward') {
      if (role !== 'team-lead') return NextResponse.json({ error: 'Only TL can forward' }, { status: 403 });

      task.status = 'pending-manager';
      task.currentApprover = 'manager';
      task.approvalChain.push({ role, userId, action: 'forwarded', remarks: body.remarks || '', timestamp: new Date() });
      await task.save();

      const managers = await User.find({ role: 'manager', isActive: true });
      if (managers.length > 0) {
        await Notification.insertMany(managers.map(m => ({
          userId: m._id, type: 'task-approved', title: 'Task Forwarded for Approval',
          message: `${name} forwarded "${task.title}" for manager approval${body.remarks ? '. Note: ' + body.remarks : ''}`,
          relatedId: task._id,
        })));
      }
      return NextResponse.json({ task, message: 'Forwarded to Manager' });
    }

    // === REGULAR UPDATE ===
    if (role === 'employee' && task.userId.toString() !== userId && task.assignedTo?.toString() !== userId) {
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
      .populate('approvalChain.userId', 'name');
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
    const { role } = getUser(request);
    if (role !== 'admin') return NextResponse.json({ error: 'Only admins can delete' }, { status: 403 });

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
