import { NextResponse } from 'next/server';
import { getAuthenticatedUser, toPublicUser } from '@/lib/server/db';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Send valid JSON.' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const password = typeof (body as Record<string, unknown>).password === 'string'
    ? (body as Record<string, unknown>).password as string
    : '';
  if (password.length < 8 || password.length > 128) {
    return NextResponse.json({ error: 'Password must be between 8 and 128 characters.' }, { status: 400 });
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: 'Open the password reset link from your email first.' }, { status: 401 });
  }

  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    console.error('POST /api/auth/update-password failed:', error.message);
    return NextResponse.json({ error: 'Could not update your password. Request a new reset link.' }, { status: 400 });
  }

  return NextResponse.json({
    message: 'Password updated successfully.',
    user: toPublicUser(user),
  });
}
