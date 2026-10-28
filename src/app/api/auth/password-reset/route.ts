import { NextResponse } from 'next/server';
import {
  readDb,
  savePasswordResetChallenge,
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
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';

  if (!email || !email.includes('@') || email.length > 254) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }

  const db = readDb();
  const user = db.users.find((u) => u.email.toLowerCase() === email);

  if (!user && !isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'No account found with that email address. Please check the email or sign up.' },
      { status: 404 }
    );
  }

  // Generate 6-digit password reset token valid for 15 minutes
  const token = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  savePasswordResetChallenge(email, token, expiresAt);

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: new URL('/auth/reset-password', request.url).toString(),
      });
    } catch {
      // Ignore if Supabase email service is not configured
    }
  }

  return NextResponse.json({
    message: 'Password reset code generated. Enter the 6-digit verification code below to set a new password.',
    email,
    resetToken: token,
    resetUrl: `/auth/reset-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`,
  });
}
