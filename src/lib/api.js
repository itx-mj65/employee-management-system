import { NextResponse } from 'next/server';

export function success(data, status = 200) {
  return NextResponse.json(data, { status });
}

export function error(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

// Sanitize string input to prevent XSS
export function sanitize(str) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[<>]/g, '').trim();
}

// Validate MongoDB ObjectId format
export function isValidId(id) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

// Extract user from middleware headers
export function getUser(request) {
  return {
    userId: request.headers.get('x-user-id'),
    role: request.headers.get('x-user-role'),
    name: request.headers.get('x-user-name'),
    isAdmin: request.headers.get('x-user-role') === 'admin',
  };
}

// Wrap API handler with error catching
export function withErrorHandler(handler) {
  return async function (request, context) {
    try {
      return await handler(request, context);
    } catch (err) {
      console.error(`API Error [${request.method} ${request.url}]:`, err.message);
      return NextResponse.json(
        { error: err.message || 'Internal server error' },
        { status: err.status || 500 }
      );
    }
  };
}
