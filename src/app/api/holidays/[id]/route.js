import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import CompanyHoliday from '@/models/CompanyHoliday';

export async function PUT(request, { params }) {
  try {
    await connectDB();
    const role = request.headers.get('x-user-role');
    if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    const body = await request.json();
    const holiday = await CompanyHoliday.findByIdAndUpdate(id, body, { new: true });
    if (!holiday) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ holiday, message: 'Holiday updated' });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectDB();
    const role = request.headers.get('x-user-role');
    if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    await CompanyHoliday.findByIdAndDelete(id);
    return NextResponse.json({ message: 'Holiday deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
