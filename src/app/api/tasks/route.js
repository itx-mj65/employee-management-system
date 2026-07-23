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
    const priority = searchParams.get('priority');
    const search = searchParams.get('search');
    const employeeId = searchParams.get('employeeId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const date = searchParams.get('date');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const query = {};

    if (role === 'admin') {
      if (employeeId && employeeId !== 'all') {
        query.$or = [{ userId: employeeId }, { assignedTo: employeeId }];
      }
    } else {
      // Employee sees tasks they created OR tasks assigned to them
      query.$or = [{ userId: userId }, { assignedTo: userId }];
    }

    if (status && status !== 'all') query.status = status;
    if (priority) query.priority = priority;
    if (search) {
      const searchQuery = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchQuery }];
        delete query.$or;
      } else {
        query.$or = searchQuery;
      }
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
      .populate('assignedTo', 'name email')
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
    const userName = request.headers.get('x-user-name');
    const role = request.headers.get('x-user-role');
    const body = await request.json();
    const { title, description, priority, expectedCompletionTime, date: taskDate, assignedTo, deadline } = body;

    if (!title) {
      return NextResponse.json({ error: 'Task title is required' }, { status: 400 });
    }

    const date = taskDate ? dayjs(taskDate).startOf('day').toDate() : dayjs().startOf('day').toDate();

    // The task owner is the creator, or assigned employee
    const taskOwner = assignedTo || userId;

    // Find or create daily task list for the task owner
    let dailyList = await DailyTaskList.findOne({ userId: taskOwner, date });
    if (!dailyList) {
      dailyList = await DailyTaskList.create({ userId: taskOwner, date, tasks: [] });
    }

    const task = await Task.create({
      dailyTaskListId: dailyList._id,
      userId,
      assignedTo: assignedTo || null,
      title,
      description: description || '',
      priority: priority || 'medium',
      expectedCompletionTime: expectedCompletionTime || '',
      deadline: deadline ? new Date(deadline) : null,
      date,
    });

    dailyList.tasks.push(task._id);
    await dailyList.save();

    // Notify assigned employee
    if (assignedTo && assignedTo !== userId) {
      await Notification.create({
        userId: assignedTo,
        type: 'new-comment',
        title: 'New Task Assigned',
        message: `${userName || 'Admin'} assigned you a task: "${title}"`,
        relatedId: task._id,
      });
    }

    const populated = await Task.findById(task._id)
      .populate('userId', 'name email')
      .populate('assignedTo', 'name email');

    return NextResponse.json({ task: populated, message: 'Task created' }, { status: 201 });
  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
