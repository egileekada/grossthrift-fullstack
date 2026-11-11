import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/server/db';
import { sendTransactionalEmailWithResult } from '@/lib/server/email';
import { buildAuthCallbackUrl, getSiteUrl } from '@/lib/server/siteUrl';
import { createAdminClient } from '@/lib/server/supabaseAdmin';
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

  const email =
    typeof (body as Record<string, unknown>).email === 'string'
      ? ((body as Record<string, unknown>).email as string).trim().toLowerCase()
      : '';
  if (!email || !email.includes('@') || email.length > 254) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Password reset is not configured yet.' }, { status: 503 });
  }

  const origin = getSiteUrl(request);
  const redirectTo = new URL('/auth/callback?next=/auth/reset-password', origin).toString();
  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

  if (error) {
    const hasServiceRole = Boolean(
      process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    if (hasServiceRole) {
      try {
        const admin = createAdminClient();
        const linkRes = await admin.auth.admin.generateLink({
          type: 'recovery',
          email,
          options: { redirectTo },
        });
        if (!linkRes.error && linkRes.data?.properties?.hashed_token) {
          const resetUrl = buildAuthCallbackUrl({
            origin,
            hashedToken: linkRes.data.properties.hashed_token,
            verificationType: linkRes.data.properties.verification_type || 'recovery',
            fallbackActionLink: linkRes.data.properties.action_link,
            nextPath: '/auth/reset-password',
          });

          const delivery = await sendTransactionalEmailWithResult({
            to: email,
            subject: 'Reset your GrossThrift password',
            heading: 'Password Reset Request',
            body: 'Click the button below to choose a new password for your GrossThrift account.',
            ctaLabel: 'Reset Password',
            ctaUrl: resetUrl,
          });

          if (delivery.ok) {
            return NextResponse.json({
              message: 'If an account exists for that email, a password reset link has been sent.',
              email,
            });
          }
        }
      } catch (fallbackErr) {
        console.error('Password reset fallback failed:', fallbackErr);
      }
    }

    console.error('POST /api/auth/password-reset failed:', error.message);
    return NextResponse.json(
      { error: 'Could not send a password reset email. Please try again.' },
      { status: 502 }
    );
  }

  // Keep the response identical for existing and unknown addresses.
  return NextResponse.json({
    message: 'If an account exists for that email, a password reset link has been sent.',
    email,
  });
}
