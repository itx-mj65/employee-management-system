import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'ems-secret-key-change-in-production';
const JWT_EXPIRY = '24h';

export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password, hashed) {
  return bcrypt.compare(password, hashed);
}

export function getUserFromRequest(request) {
  const token = request.cookies.get('token')?.value
    || request.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) return null;
  return verifyToken(token);
}
