import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Otp from '@/models/Otp';
import { sendOtpEmail } from '@/lib/email';

const ALLOWED_DOMAIN = '@medbillingrcm.com';

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();
    const { name, email, password, phone, department, position } = body;

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!email || !email.trim()) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    // Validate name (min 2 chars, only letters and spaces)
    if (name.trim().length < 2) {
      return NextResponse.json({ error: 'Name must be at least 2 characters' }, { status: 400 });
    }

    // Validate email domain
    const emailLower = email.toLowerCase().trim();
    if (!emailLower.endsWith(ALLOWED_DOMAIN)) {
      return NextResponse.json({ 
        error: `Only ${ALLOWED_DOMAIN} email addresses are allowed` 
      }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(emailLower)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Validate password
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }
    if (!/[A-Z]/.test(password)) {
      return NextResponse.json({ error: 'Password must contain at least one uppercase letter' }, { status: 400 });
    }
    if (!/[0-9]/.test(password)) {
      return NextResponse.json({ error: 'Password must contain at least one number' }, { status: 400 });
    }

    // Validate phone (if provided)
    if (phone && phone.trim()) {
      const phoneClean = phone.replace(/[\s\-\(\)]/g, '');
      if (phoneClean.length < 10) {
        return NextResponse.json({ error: 'Phone number must be at least 10 digits' }, { status: 400 });
      }
    }

    // Check if email already registered
    const existingUser = await User.findOne({ email: emailLower });
    if (existingUser) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 });
    }

    // Rate limit: max 3 OTPs per email per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentOtps = await Otp.countDocuments({ 
      email: emailLower, 
      createdAt: { $gte: oneHourAgo } 
    });
    if (recentOtps >= 3) {
      return NextResponse.json({ error: 'Too many attempts. Please wait an hour.' }, { status: 429 });
    }

    // Delete any existing OTPs for this email
    await Otp.deleteMany({ email: emailLower });

    // Generate and save OTP
    const otp = generateOtp();
    await Otp.create({
      email: emailLower,
      otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });

    // Send OTP email
    const result = await sendOtpEmail(emailLower, otp);

    return NextResponse.json({ 
      message: 'Verification code sent to your email',
      email: emailLower,
      // In dev mode (no SMTP), include OTP for testing
      ...(result.dev ? { devOtp: otp } : {}),
    });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 });
  }
}
