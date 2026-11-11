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
    return NextResponse.json(
      { error: 'Confirmation email service is not configured yet.' },
      { status: 503 }
    );
  }

  const origin = getSiteUrl(request);
  const redirectTo = new URL('/auth/callback?next=/dashboard', origin).toString();
  const supabase = createClient();

  // 1. Try Supabase native resend first (works once Gmail/custom SMTP is set in Supabase Auth)
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: redirectTo },
  });

  if (!error) {
    return NextResponse.json({
      message: `Confirmation email sent to ${email}. Check your inbox and spam folder.`,
      email,
    });
  }

  // 2. Fallback via Supabase Admin generateLink + Resend
  const hasServiceRole = Boolean(
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  if (hasServiceRole) {
    try {
      const admin = createAdminClient();
      const { data: usersList } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 500,
      });
      const existing = usersList?.users?.find((u) => u.email?.toLowerCase() === email);

      if (!existing) {
        return NextResponse.json({
          message:
            'If an unconfirmed account exists for that email, a confirmation link has been sent.',
          email,
        });
      }

      if (existing.email_confirmed_at) {
        return NextResponse.json(
          { error: 'This email is already confirmed. You can sign in right away.' },
          { status: 400 }
        );
      }

      const linkRes = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: { redirectTo },
      });

      const confirmUrl = buildAuthCallbackUrl({
        origin,
        hashedToken: linkRes.data?.properties?.hashed_token,
        verificationType: linkRes.data?.properties?.verification_type || 'magiclink',
        fallbackActionLink: linkRes.data?.properties?.action_link,
        nextPath: '/dashboard',
      });

      if (confirmUrl) {
        const displayName =
          (existing.user_metadata?.display_name as string | undefined) ||
          (existing.user_metadata?.name as string | undefined) ||
          email.split('@')[0];

        const delivery = await sendTransactionalEmailWithResult({
          to: email,
          subject: 'Confirm your GrossThrift email address',
          heading: `Confirm your email, ${displayName}`,
          body: 'Click the button below to confirm your email address and sign in to your GrossThrift account.',
          ctaLabel: 'Confirm Email Address',
          ctaUrl: confirmUrl,
        });

        if (delivery.ok) {
          return NextResponse.json({
            message: `Confirmation email resent to ${email}. Check your inbox and spam folder.`,
            email,
          });
        }

        return NextResponse.json(
          {
            error: delivery.error?.includes('only send testing emails')
              ? 'Resend sandbox mode can only send to your Resend owner email until Gmail/custom SMTP is enabled in Supabase Auth.'
              : delivery.error || 'Could not deliver confirmation email.',
          },
          { status: 502 }
        );
      }
    } catch (fallbackErr) {
      console.error('POST /api/auth/resend-confirmation fallback error:', fallbackErr);
    }
  }

  return NextResponse.json(
    { error: error.message || 'Could not resend confirmation email.' },
    { status: 502 }
  );
}

