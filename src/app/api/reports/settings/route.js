import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getUser } from '@/lib/api';
import ReportSetting from '@/models/ReportSetting';
import User from '@/models/User';

export async function GET(request) {
  try {
    await connectDB();
    const { userId, role } = getUser(request);
    const me = await User.findById(userId);

    let query = {};
    if (role === 'admin') {
      // admin sees all
    } else {
      query.department = me?.department || '';
    }

    const settings = await ReportSetting.find(query)
      .populate('createdBy', 'name')
      .populate('specificUsers', 'name')
      .lean();

    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const { userId, role } = getUser(request);
    if (!['admin', 'team-lead', 'manager'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const me = await User.findById(userId);
    const { mode, specificUsers } = await request.json();
    const dept = me?.department;
    if (!dept) return NextResponse.json({ error: 'No department' }, { status: 400 });

    // Upsert — one setting per department
    let setting = await ReportSetting.findOne({ department: dept });
    if (setting) {
      setting.mode = mode || 'all';
      setting.specificUsers = mode === 'specific' ? (specificUsers || []) : [];
      setting.isActive = true;
      setting.createdBy = userId;
      await setting.save();
    } else {
      setting = await ReportSetting.create({
        department: dept,
        mode: mode || 'all',
        specificUsers: mode === 'specific' ? (specificUsers || []) : [],
        isActive: true,
        createdBy: userId,
      });
    }

    return NextResponse.json({ setting, message: 'Report requirement set' });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    await connectDB();
    const { userId, role } = getUser(request);
    if (!['admin', 'team-lead', 'manager'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const me = await User.findById(userId);
    await ReportSetting.updateMany({ department: me?.department }, { isActive: false });
    return NextResponse.json({ message: 'Report requirement disabled' });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
