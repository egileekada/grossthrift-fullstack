import { NextResponse } from 'next/server';
import {
  readDb,
  writeDb,
  hashPassword,
  getAuthenticatedUser,
  createSession,
  toPublicUser,
  verifyPasswordResetChallenge,
  isSupabaseConfigured,
} from '@/lib/server/db';
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

  const input = body as Record<string, unknown>;
  const password = typeof input.password === 'string' ? input.password : '';
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const token = typeof input.token === 'string' ? input.token.trim() : '';

  if (password.length < 8 || password.length > 128) {
    return NextResponse.json(
      { error: 'Password must be between 8 and 128 characters.' },
      { status: 400 }
    );
  }

  const db = readDb();

  // Flow 1: Reset password via email + 6-digit reset token
  if (email && token) {
    if (!verifyPasswordResetChallenge(email, token)) {
      return NextResponse.json(
        { error: 'Invalid or expired reset code. Please request a new code.' },
        { status: 400 }
      );
    }

    const userIdx = db.users.findIndex((u) => u.email.toLowerCase() === email);
    if (userIdx === -1) {
      return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
    }

    db.users[userIdx].passwordHash = hashPassword(password);
    writeDb(db);

    createSession(db.users[userIdx].id);

    return NextResponse.json({
      message: 'Your password has been reset successfully.',
      user: toPublicUser(db.users[userIdx]),
    });
  }

  // Flow 2: Authenticated user updating their own password
  const authUser = getAuthenticatedUser();
  if (!authUser) {
    return NextResponse.json(
      { error: 'Provide your reset code or sign in before setting a new password.' },
      { status: 401 }
    );
  }

  const userIdx = db.users.findIndex((u) => u.id === authUser.id);
  if (userIdx === -1) {
    return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
  }

  db.users[userIdx].passwordHash = hashPassword(password);
  writeDb(db);
  createSession(db.users[userIdx].id);

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      await supabase.auth.updateUser({ password });
    } catch {
      // Ignore if Supabase session is not active
    }
  }

  return NextResponse.json({
    message: 'Password updated successfully.',
    user: toPublicUser(db.users[userIdx]),
  });
}
