import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import CompanyHoliday from '@/models/CompanyHoliday';

export async function GET() {
  try {
    await connectDB();
    const holidays = await CompanyHoliday.find().sort({ date: 1 });
    return NextResponse.json({ holidays });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const role = request.headers.get('x-user-role');
    const userId = request.headers.get('x-user-id');
    if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { title, date, description } = await request.json();
    if (!title || !date) {
      return NextResponse.json({ error: 'Title and date required' }, { status: 400 });
    }

    const holiday = await CompanyHoliday.create({ title, date, description, createdBy: userId });
    return NextResponse.json({ holiday, message: 'Holiday added' }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
