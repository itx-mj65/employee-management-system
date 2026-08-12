import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getUser } from '@/lib/api';
import Task from '@/models/Task';
import User from '@/models/User';
import Notification from '@/models/Notification';

export async function GET(request) {
  try {
    await connectDB();
    const { userId, role } = getUser(request);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const empId = searchParams.get('employeeId') || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const conditions = [];

    if (role === 'admin') {
      if (empId !== 'all') conditions.push({ $or: [{ userId: empId }, { assignedBy: empId }] });
    } else if (role === 'manager' || role === 'team-lead') {
      const me = await User.findById(userId).lean();
      const deptUsers = await User.find({ department: me?.department, isActive: true }).select('_id').lean();
      const deptIds = deptUsers.map(u => u._id);
      if (empId !== 'all') {
        conditions.push({ userId: empId });
      } else {
        conditions.push({ $or: [{ userId: { $in: deptIds } }, { assignedBy: userId }] });
      }
    } else {
      conditions.push({ userId });
    }

    if (status) conditions.push({ status });

    const query = conditions.length > 0 ? { $and: conditions } : {};
    const total = await Task.countDocuments(query);
    const tasks = await Task.find(query)
      .populate('userId', 'name email department')
      .populate('assignedBy', 'name')
      .populate('assignedTo', 'name')
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({ tasks, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('Tasks GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const { userId, role } = getUser(request);

    // Only TL, Manager, Admin can create tasks
    if (!['admin', 'manager', 'team-lead'].includes(role)) {
      return NextResponse.json({ error: 'Only managers and team leads can assign tasks' }, { status: 403 });
    }

    const { title, description, priority, deadline, assignedTo } = await request.json();
    if (!title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 });
    if (!assignedTo) return NextResponse.json({ error: 'Must assign task to an employee' }, { status: 400 });

    const task = await Task.create({
      title: title.trim(),
      description: description?.trim() || '',
      priority: priority || 'medium',
      deadline: deadline || null,
      userId: assignedTo,
      assignedTo,
      assignedBy: userId,
      status: 'assigned',
    });

    // Notify the assigned employee
    const assigner = await User.findById(userId).select('name').lean();
    await Notification.create({
      userId: assignedTo, type: 'task-approved',
      title: 'New Task Assigned',
      message: `${assigner?.name} assigned you: "${title.trim()}"`,
      relatedId: task._id,
    });

    const populated = await Task.findById(task._id)
      .populate('userId', 'name email department')
      .populate('assignedBy', 'name').lean();

    return NextResponse.json({ task: populated, message: 'Task assigned' }, { status: 201 });
  } catch (error) {
    console.error('Tasks POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
