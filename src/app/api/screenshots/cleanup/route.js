import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getUser } from '@/lib/api';
import Screenshot from '@/models/Screenshot';
import cloudinary from '@/lib/cloudinary';

export async function POST(request) {
  try {
    await connectDB();
    const { role } = getUser(request);
    if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Find screenshots older than 24h
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const old = await Screenshot.find({ takenAt: { $lt: cutoff } }).lean();

    let deleted = 0;
    for (const s of old) {
      try {
        await cloudinary.uploader.destroy(s.cloudinaryId);
        await Screenshot.findByIdAndDelete(s._id);
        deleted++;
      } catch (e) { console.error('Delete error:', s._id, e.message); }
    }

    return NextResponse.json({ message: `Cleaned ${deleted} screenshots`, deleted });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
