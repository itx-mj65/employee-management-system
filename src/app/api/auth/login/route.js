import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { comparePassword, generateToken } from '@/lib/auth';
import { rateLimit, clearRateLimit } from '@/lib/rateLimit';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Rate limit by email — 5 attempts per 15 minutes
    const key = `login:${email.toLowerCase()}`;
    const limit = rateLimit(key);
    if (!limit.allowed) {
      return NextResponse.json({ 
        error: `Too many login attempts. Try again in ${Math.ceil(limit.retryAfter / 60)} minutes.` 
      }, { status: 429 });
    }

    await connectDB();
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'Account is disabled. Contact admin.' }, { status: 403 });
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return NextResponse.json({ error: `Invalid credentials. ${limit.remaining} attempts remaining.` }, { status: 401 });
    }

    // Successful login — clear rate limit
    clearRateLimit(key);

    const token = generateToken({
      userId: user._id.toString(),
      role: user.role,
      name: user.name,
      email: user.email,
    });

    const response = NextResponse.json({
      user: {
        _id: user._id, name: user.name, email: user.email, role: user.role,
        department: user.department, position: user.position, phone: user.phone, avatar: user.avatar,
      },
      message: 'Login successful',
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
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
