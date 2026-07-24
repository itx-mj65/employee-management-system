import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getUser } from '@/lib/api';
import Department from '@/models/Department';
import User from '@/models/User';

export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') !== 'false';

    const query = activeOnly ? { isActive: true } : {};
    const departments = await Department.find(query)
      .populate('head', 'name email role')
      .sort({ name: 1 });

    // Get employee count per department
    const deptStats = await Promise.all(departments.map(async (dept) => {
      const count = await User.countDocuments({ department: dept.name, isActive: true });
      const onBreak = await getBreakStatus(dept.name);
      return { ...dept.toObject(), employeeCount: count, breakStatus: onBreak };
    }));

    return NextResponse.json({ departments: deptStats });
  } catch (error) {
    console.error('Get departments error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

async function getBreakStatus(deptName) {
  const Attendance = (await import('@/models/Attendance')).default;
  const dayjs = (await import('dayjs')).default;
  const today = dayjs().startOf('day').toDate();
  const users = await User.find({ department: deptName, isActive: true }).select('_id');
  const uids = users.map(u => u._id);
  const attendance = await Attendance.find({ userId: { $in: uids }, date: today });
  let onBreak = 0;
  for (const a of attendance) {
    const lb = a.shortBreaks?.[a.shortBreaks.length - 1];
    if (lb && lb.start && !lb.end) onBreak++;
  }
  return { onBreak, slots: 1 };
}

export async function POST(request) {
  try {
    await connectDB();
    const { isAdmin } = getUser(request);
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { name, description, head, breakSlots } = await request.json();
    if (!name?.trim()) return NextResponse.json({ error: 'Department name is required' }, { status: 400 });

    const existing = await Department.findOne({ name: name.trim() });
    if (existing) return NextResponse.json({ error: 'Department already exists' }, { status: 400 });

    const dept = await Department.create({
      name: name.trim(),
      description: description?.trim() || '',
      head: head || null,
      breakSlots: breakSlots || 1,
    });

    return NextResponse.json({ department: dept, message: 'Department created' }, { status: 201 });
  } catch (error) {
    console.error('Create department error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
