import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Otp from '@/models/Otp';
import { sendOtpEmail } from '@/lib/email';

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request) {
  try {
    await connectDB();
    const { email } = await request.json();
    const emailLower = email.toLowerCase().trim();

    // Rate limit
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentOtps = await Otp.countDocuments({ email: emailLower, createdAt: { $gte: oneHourAgo } });
    if (recentOtps >= 5) {
      return NextResponse.json({ error: 'Too many attempts. Please wait.' }, { status: 429 });
    }

    await Otp.deleteMany({ email: emailLower });

    const otp = generateOtp();
    await Otp.create({
      email: emailLower,
      otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    const result = await sendOtpEmail(emailLower, otp);

    return NextResponse.json({ 
      message: 'New verification code sent',
      ...(result.dev ? { devOtp: otp } : {}),
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    return NextResponse.json({ error: 'Failed to resend code' }, { status: 500 });
  }
}
