import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Otp from '@/models/Otp';
import { hashPassword, generateToken } from '@/lib/auth';

export async function POST(request) {
  try {
    await connectDB();
    const { email, otp, name, password, phone, department, position } = await request.json();

    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and verification code are required' }, { status: 400 });
    }

    const emailLower = email.toLowerCase().trim();

    // Find the OTP record
    const otpRecord = await Otp.findOne({ email: emailLower });
    if (!otpRecord) {
      return NextResponse.json({ error: 'No verification code found. Please request a new one.' }, { status: 400 });
    }

    // Check if expired
    if (new Date() > otpRecord.expiresAt) {
      await Otp.deleteOne({ _id: otpRecord._id });
      return NextResponse.json({ error: 'Verification code expired. Please request a new one.' }, { status: 400 });
    }

    // Check attempts (max 5)
    if (otpRecord.attempts >= 5) {
      await Otp.deleteOne({ _id: otpRecord._id });
      return NextResponse.json({ error: 'Too many failed attempts. Please request a new code.' }, { status: 400 });
    }

    // Verify OTP
    if (otpRecord.otp !== otp.trim()) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      const remaining = 5 - otpRecord.attempts;
      return NextResponse.json({ 
        error: `Invalid code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.` 
      }, { status: 400 });
    }

    // OTP verified — check if user already exists (race condition)
    const existingUser = await User.findOne({ email: emailLower });
    if (existingUser) {
      await Otp.deleteOne({ _id: otpRecord._id });
      return NextResponse.json({ error: 'Account already exists. Please login.' }, { status: 400 });
    }

    // Create the user
    const hashedPassword = await hashPassword(password);
    const user = await User.create({
      name: name.trim(),
      email: emailLower,
      password: hashedPassword,
      role: 'employee',
      department: department?.trim() || '',
      position: position?.trim() || '',
      phone: phone?.trim() || '',
      isActive: true,
    });

    // Clean up OTP
    await Otp.deleteOne({ _id: otpRecord._id });

    // Auto-login: generate token
    const token = generateToken({
      userId: user._id.toString(),
      role: user.role,
      name: user.name,
      email: user.email,
    });

    const response = NextResponse.json({
      message: 'Account created successfully!',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        position: user.position,
      },
    });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
