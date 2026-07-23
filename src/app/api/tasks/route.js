import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Task from '@/models/Task';
import DailyTaskList from '@/models/DailyTaskList';
import dayjs from 'dayjs';

export async function GET(request) {
  try {
    await connectDB();
    const userId = request.headers.get('x-user-id');
    const role = request.headers.get('x-user-role');
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const search = searchParams.get('search');
    const employeeId = searchParams.get('employeeId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const date = searchParams.get('date');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const query = {};

    if (role === 'admin' && employeeId) {
      query.userId = employeeId;
    } else if (role !== 'admin') {
      query.userId = userId;
    }

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }
    if (date) {
      const d = dayjs(date);
      query.date = { $gte: d.startOf('day').toDate(), $lte: d.endOf('day').toDate() };
    } else if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const total = await Task.countDocuments(query);
    const tasks = await Task.find(query)
      .populate('userId', 'name email')
      .populate('approvedBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return NextResponse.json({
      tasks,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const userId = request.headers.get('x-user-id');
    const body = await request.json();
    const { title, description, priority, expectedCompletionTime, date: taskDate } = body;

    if (!title) {
      return NextResponse.json({ error: 'Task title is required' }, { status: 400 });
    }

    const date = taskDate ? dayjs(taskDate).startOf('day').toDate() : dayjs().startOf('day').toDate();

    // Find or create daily task list
    let dailyList = await DailyTaskList.findOne({ userId, date });
    if (!dailyList) {
      dailyList = await DailyTaskList.create({ userId, date, tasks: [] });
    }

    const task = await Task.create({
      dailyTaskListId: dailyList._id,
      userId,
      title,
      description: description || '',
      priority: priority || 'medium',
      expectedCompletionTime: expectedCompletionTime || '',
      date,
    });

    dailyList.tasks.push(task._id);
    await dailyList.save();

    const populated = await Task.findById(task._id).populate('userId', 'name email');

    return NextResponse.json({ task: populated, message: 'Task created' }, { status: 201 });
  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
