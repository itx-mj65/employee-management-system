import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import DailyTaskList from '@/models/DailyTaskList';
import Task from '@/models/Task';
import dayjs from 'dayjs';

export async function GET(request) {
  try {
    await connectDB();
    const userId = request.headers.get('x-user-id');
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    const targetDate = date ? dayjs(date).startOf('day').toDate() : dayjs().startOf('day').toDate();

    const dailyList = await DailyTaskList.findOne({ userId, date: targetDate })
      .populate({
        path: 'tasks',
        populate: [
          { path: 'userId', select: 'name email' },
          { path: 'assignedTo', select: 'name email' },
        ],
      });

    return NextResponse.json({ dailyTaskList: dailyList });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const userId = request.headers.get('x-user-id');
    const { tasks } = await request.json();
    const today = dayjs().startOf('day').toDate();

    let dailyList = await DailyTaskList.findOne({ userId, date: today });
    if (!dailyList) {
      dailyList = await DailyTaskList.create({ userId, date: today, tasks: [] });
    }

    const createdTasks = [];
    for (const t of tasks) {
      const task = await Task.create({
        dailyTaskListId: dailyList._id,
        userId,
        title: t.title,
        description: t.description || '',
        priority: t.priority || 'medium',
        expectedCompletionTime: t.expectedCompletionTime || '',
        date: today,
        approvalChain: [],
      });
      dailyList.tasks.push(task._id);
      createdTasks.push(task);
    }

    await dailyList.save();

    return NextResponse.json({
      dailyTaskList: dailyList,
      tasks: createdTasks,
      message: 'Daily tasks created',
    }, { status: 201 });
  } catch (error) {
    console.error('Create daily tasks error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
