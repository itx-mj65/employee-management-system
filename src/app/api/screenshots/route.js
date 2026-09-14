import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getUser } from '@/lib/api';
import Screenshot from '@/models/Screenshot';
import User from '@/models/User';
import cloudinary from '@/lib/cloudinary';
import dayjs from 'dayjs';

// POST — Upload screenshot from extension
export async function POST(request) {
  try {
    await connectDB();
    const { userId, role } = getUser(request);

    const body = await request.json();
    const { imageData, takenAt } = body;

    if (!imageData) return NextResponse.json({ error: 'No image data' }, { status: 400 });

    // Get user's department
    const user = await User.findById(userId).select('name department').lean();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const capturedAt = takenAt ? new Date(takenAt) : new Date();
    const expiresAt = new Date(capturedAt.getTime() + 24 * 60 * 60 * 1000); // 24h

    // Upload to Cloudinary
    const uploadRes = await cloudinary.uploader.upload(imageData, {
      folder: `ems-screenshots/${user.department}`,
      public_id: `${userId}_${Date.now()}`,
      resource_type: 'image',
      format: 'jpg',
      quality: 60,
      width: 1280,
      crop: 'scale',
      // Auto-delete from Cloudinary after 25h
      invalidate: true,
    });

    // Generate thumbnail
    const thumbnailUrl = cloudinary.url(uploadRes.public_id, {
      width: 320,
      height: 180,
      crop: 'fill',
      quality: 50,
      format: 'jpg',
    });

    const screenshot = await Screenshot.create({
      userId,
      department: user.department,
      cloudinaryId: uploadRes.public_id,
      url: uploadRes.secure_url,
      thumbnailUrl,
      takenAt: capturedAt,
      expiresAt,
      sessionId: dayjs(capturedAt).format('YYYY-MM-DD'),
      metadata: {
        width: uploadRes.width,
        height: uploadRes.height,
        format: uploadRes.format,
        bytes: uploadRes.bytes,
      },
    });

    return NextResponse.json({ screenshot: { _id: screenshot._id, takenAt: screenshot.takenAt }, message: 'Uploaded' }, { status: 201 });
  } catch (error) {
    console.error('Screenshot upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

// GET — Fetch screenshots (TL sees own dept, Admin sees all/filter)
export async function GET(request) {
  try {
    await connectDB();
    const { userId, role } = getUser(request);
    const { searchParams } = new URL(request.url);

    const targetUserId = searchParams.get('userId');
    const targetDept = searchParams.get('department');
    const date = searchParams.get('date') || dayjs().format('YYYY-MM-DD');

    const startOfDay = dayjs(date).startOf('day').toDate();
    const endOfDay = dayjs(date).endOf('day').toDate();
    const query = { takenAt: { $gte: startOfDay, $lte: endOfDay } };

    if (role === 'team-lead') {
      // TL sees only their department
      const me = await User.findById(userId).select('department').lean();
      query.department = me?.department;
      if (targetUserId) {
        // Verify this user is in TL's dept
        const targetUser = await User.findById(targetUserId).select('department').lean();
        if (targetUser?.department !== me?.department) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        query.userId = targetUserId;
      }
    } else if (role === 'manager') {
      // Manager sees their dept (expandable later by admin)
      const me = await User.findById(userId).select('department').lean();
      query.department = me?.department;
      if (targetUserId) query.userId = targetUserId;
    } else if (role === 'admin') {
      // Admin sees all — can filter by dept or user
      if (targetDept) query.department = targetDept;
      if (targetUserId) query.userId = targetUserId;
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const screenshots = await Screenshot.find(query)
      .populate('userId', 'name department')
      .sort({ takenAt: 1 })
      .select('userId takenAt thumbnailUrl url department metadata')
      .lean();

    return NextResponse.json({ screenshots, date, total: screenshots.length });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
