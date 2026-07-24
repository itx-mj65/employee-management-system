import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Task from '@/models/Task';
import DailyTaskList from '@/models/DailyTaskList';
import Notification from '@/models/Notification';
import User from '@/models/User';
import dayjs from 'dayjs';

export async function GET(request) {
  try {
    await connectDB();
    const userId = request.headers.get('x-user-id');
    const role = request.headers.get('x-user-role');
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const employeeId = searchParams.get('employeeId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build query safely
    const conditions = [];

    // User filter
    if (role === 'admin' || role === 'manager') {
      if (employeeId && employeeId !== 'all') {
        conditions.push({ $or: [{ userId: employeeId }, { assignedTo: employeeId }] });
      }
    } else {
      conditions.push({ $or: [{ userId: userId }, { assignedTo: userId }] });
    }

    // Status filter
    if (status && status !== 'all' && status !== '') {
      conditions.push({ status });
    }

    // Search filter
    if (search && search.trim()) {
      conditions.push({
        $or: [
          { title: { $regex: search.trim(), $options: 'i' } },
          { description: { $regex: search.trim(), $options: 'i' } },
        ]
      });
    }

    const query = conditions.length > 0 ? { $and: conditions } : {};

    const total = await Task.countDocuments(query);
    const tasks = await Task.find(query)
      .populate('userId', 'name email role')
      .populate('assignedTo', 'name email role')
      .populate('approvalChain.userId', 'name')
      .populate('rejectedBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({ tasks, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('Get tasks error:', error);
    return NextResponse.json({ error: 'Failed to load tasks: ' + error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const userId = request.headers.get('x-user-id');
    const userName = request.headers.get('x-user-name');
    const body = await request.json();
    const { title, description, priority, expectedCompletionTime, assignedTo, deadline } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Task title is required' }, { status: 400 });
    }

    const date = dayjs().startOf('day').toDate();

    // Find or create daily task list
    const taskOwner = assignedTo || userId;
    let dailyList = await DailyTaskList.findOne({ userId: taskOwner, date });
    if (!dailyList) {
      dailyList = await DailyTaskList.create({ userId: taskOwner, date, tasks: [] });
    }

    const taskData = {
      dailyTaskListId: dailyList._id,
      userId,
      title: title.trim(),
      description: (description || '').trim(),
      priority: priority || 'medium',
      expectedCompletionTime: expectedCompletionTime || '',
      date,
      approvalChain: [],
    };

    if (assignedTo && assignedTo.length === 24) taskData.assignedTo = assignedTo;
    if (deadline) taskData.deadline = new Date(deadline);

    const task = await Task.create(taskData);
    dailyList.tasks.push(task._id);
    await dailyList.save();

    // Notify assigned employee
    if (assignedTo && assignedTo !== userId && assignedTo.length === 24) {
      await Notification.create({
        userId: assignedTo,
        type: 'new-comment',
        title: 'New Task Assigned',
        message: `${userName || 'Someone'} assigned you: "${title.trim()}"`,
        relatedId: task._id,
      });
    }

    const populated = await Task.findById(task._id)
      .populate('userId', 'name email role')
      .populate('assignedTo', 'name email role');

    return NextResponse.json({ task: populated, message: 'Task created' }, { status: 201 });
  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json({ error: 'Failed to create task: ' + error.message }, { status: 500 });
  }
}
