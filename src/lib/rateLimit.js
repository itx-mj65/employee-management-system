// In-memory rate limiter — resets on server restart (fine for Vercel serverless)
const attempts = new Map();

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

export function rateLimit(key) {
  const now = Date.now();
  const record = attempts.get(key);

  // Clean old entries periodically
  if (attempts.size > 10000) {
    for (const [k, v] of attempts) {
      if (now - v.firstAttempt > WINDOW_MS) attempts.delete(k);
    }
  }

  if (!record || now - record.firstAttempt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAttempt: now });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 };
  }

  if (record.count >= MAX_ATTEMPTS) {
    const retryAfter = Math.ceil((record.firstAttempt + WINDOW_MS - now) / 1000);
    return { allowed: false, remaining: 0, retryAfter };
  }

  record.count++;
  return { allowed: true, remaining: MAX_ATTEMPTS - record.count };
}

export function clearRateLimit(key) {
  attempts.delete(key);
}
