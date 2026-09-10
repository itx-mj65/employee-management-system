import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Task from '@/models/Task';
import Attendance from '@/models/Attendance';
import { workToday, dayjs } from '@/lib/date';

export async function POST(request) {
  try {
    await connectDB();
    const userId = request.headers.get('x-user-id');
    const today = workToday();

    const existing = await Attendance.findOne({ userId, date: today });
    
    if (existing) {
      // If auto-checked-out, allow re-check-in by resetting the record
      if (existing.autoCheckout) {
        existing.checkIn = new Date();
        existing.checkOut = null;
        existing.autoCheckout = false;
        existing.reportMissing = false;
        existing.totalWorkingHours = 0;
        existing.totalBreakHours = 0;
        existing.lunchBreakStart = null;
        existing.lunchBreakEnd = null;
        existing.shortBreaks = [];
        await existing.save();
    
    // ── Resume task timers that were paused at last checkout ──
    // Find tasks in 'accepted' status with no timer running (paused)
    const pausedTasks = await Task.find({ userId, timerStartedAt: null, status: 'accepted' });
    for (const task of pausedTasks) {
      task.timerStartedAt = attendance.checkIn;
      if (!task.timeLog) task.timeLog = [];
      task.timeLog.push({ start: attendance.checkIn });
      await task.save();
    }
    if (pausedTasks.length > 0) console.log(`Resumed ${pausedTasks.length} task timer(s) on check-in for user ${userId}`);

    return NextResponse.json({ attendance: existing, message: 'Re-checked in (previous auto-checkout cleared)' }, { status: 200 });
      }
      
      // Already manually checked in
      if (!existing.checkOut) {
        return NextResponse.json({ error: 'Already checked in today' }, { status: 400 });
      }
      
      // Already checked out manually — can't re-check-in
      return NextResponse.json({ error: 'Already checked out today' }, { status: 400 });
    }

    const attendance = await Attendance.create({
      userId,
      date: today,
      checkIn: new Date(),
      status: 'present',
    });


    // ── Resume task timers that were paused at last checkout ──
    // Find tasks in 'accepted' status with no timer running (paused)
    const pausedTasks = await Task.find({ userId, timerStartedAt: null, status: 'accepted' });
    for (const task of pausedTasks) {
      task.timerStartedAt = attendance.checkIn;
      if (!task.timeLog) task.timeLog = [];
      task.timeLog.push({ start: attendance.checkIn });
      await task.save();
    }
    if (pausedTasks.length > 0) console.log(`Resumed ${pausedTasks.length} task timer(s) on check-in for user ${userId}`);

    return NextResponse.json({ attendance, message: 'Checked in successfully' }, { status: 201 });
  } catch (error) {
    console.error('Check-in error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
