import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/server/db';
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

  const email = typeof (body as Record<string, unknown>).email === 'string'
    ? ((body as Record<string, unknown>).email as string).trim().toLowerCase()
    : '';
  if (!email || !email.includes('@') || email.length > 254) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Password reset is not configured yet.' }, { status: 503 });
  }

  const supabase = createClient();
  const redirectTo = new URL('/auth/callback?next=/auth/reset-password', request.url).toString();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) {
    console.error('POST /api/auth/password-reset failed:', error.message);
    return NextResponse.json({ error: 'Could not send a password reset email. Please try again.' }, { status: 502 });
  }

  // Keep the response identical for existing and unknown addresses.
  return NextResponse.json({
    message: 'If an account exists for that email, a password reset link has been sent.',
    email,
  });
}
