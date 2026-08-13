import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getUser } from '@/lib/api';
import SubDepartment from '@/models/SubDepartment';

export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department');
    const query = { isActive: true };
    if (department) query.department = department;
    const subDepts = await SubDepartment.find(query).sort({ name: 1 }).lean();
    return NextResponse.json({ subDepartments: subDepts });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const { role } = getUser(request);
    if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { name, department, description } = await request.json();
    if (!name?.trim() || !department?.trim()) return NextResponse.json({ error: 'Name and department required' }, { status: 400 });
    const existing = await SubDepartment.findOne({ name: name.trim(), department: department.trim() });
    if (existing) return NextResponse.json({ error: 'Already exists' }, { status: 400 });
    const sub = await SubDepartment.create({ name: name.trim(), department: department.trim(), description: description?.trim() || '' });
    return NextResponse.json({ subDepartment: sub, message: 'Created' }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    await connectDB();
    const { role } = getUser(request);
    if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { id } = await request.json();
    await SubDepartment.findByIdAndUpdate(id, { isActive: false });
    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
