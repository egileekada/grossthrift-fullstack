import { NextResponse } from 'next/server'
import {
  ensureUserProfile,
  getAuthenticatedUser,
  isSupabaseConfigured,
  toPublicUser,
} from '@/lib/server/db'
import { sendTransactionalEmailWithResult } from '@/lib/server/email'
import { buildAuthCallbackUrl, getSiteUrl } from '@/lib/server/siteUrl'
import { createAdminClient } from '@/lib/server/supabaseAdmin'
import { createClient } from '@/lib/supabase/server'

function isConfirmationEmailError(message?: string): boolean {
  if (!message) return false
  const lower = message.toLowerCase()
  return (
    lower.includes('error sending confirmation email') ||
    lower.includes('sending email') ||
    lower.includes('rate limit') ||
    lower.includes('smtp')
  )
}

function isDuplicateEmailError(message?: string): boolean {
  if (!message) return false
  const lower = message.toLowerCase()
  return (
    lower.includes('already registered') ||
    lower.includes('already exists') ||
    lower.includes('duplicate') ||
    lower.includes('email_exists')
  )
}

async function findAuthUserByEmail(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
) {
  const perPage = 200
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error || !data?.users?.length) return null
    const match = data.users.find((u) => u.email?.toLowerCase() === email)
    if (match) return match
    if (data.users.length < perPage) return null
  }
  return null
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Send valid JSON.' }, { status: 400 })
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const input = body as Record<string, unknown>
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : ''
  const password = typeof input.password === 'string' ? input.password : ''
  const name = typeof input.name === 'string' ? input.name.trim() : ''
  const phone = typeof input.phone === 'string' && input.phone.trim() ? input.phone.trim() : null
  const country = typeof input.country === 'string' && input.country.trim() ? input.country.trim() : 'Nigeria'
  const countryFlag =
    typeof input.countryFlag === 'string' && input.countryFlag.trim() ? input.countryFlag.trim() : '🇳🇬'

  if (!email || !email.includes('@') || email.length > 254) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }
  if (name.length < 2 || name.length > 100) {
    return NextResponse.json({ error: 'Enter a name between 2 and 100 characters.' }, { status: 400 })
  }
  if (password.length < 8 || password.length > 128) {
    return NextResponse.json({ error: 'Password must be between 8 and 128 characters.' }, { status: 400 })
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Account signup is not configured yet.' }, { status: 503 })
  }

  const origin = getSiteUrl(request)
  const redirectTo = new URL('/auth/callback?next=/dashboard', origin).toString()
  const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`
  const userMetadata = {
    display_name: name,
    name,
    phone,
    country,
    country_flag: countryFlag,
    avatar_url: avatarUrl,
  }

  const hasServiceRole = Boolean(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)
  if (hasServiceRole) {
    try {
      const admin = createAdminClient()
      const existing = await findAuthUserByEmail(admin, email)
      if (existing) {
        return NextResponse.json(
          {
            error: existing.email_confirmed_at
              ? 'An account with this email already exists. Please sign in instead.'
              : 'An account with this email already exists and is awaiting confirmation. Please check your inbox or resend the confirmation email.',
          },
          { status: 409 },
        )
      }
    } catch (lookupErr) {
      console.warn('Signup duplicate email check warning:', lookupErr)
    }
  }

  const supabase = createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectTo,
      data: userMetadata,
    },
  })

  // Primary path succeeded cleanly
  if (!error && data.user) {
    // Supabase returns a user with empty identities when an email already exists.
    if (!data.user.identities || data.user.identities.length === 0) {
      return NextResponse.json(
        {
          error:
            'An account with this email already exists. Please sign in or resend your confirmation email.',
        },
        { status: 409 },
      )
    }

    if (data.session && data.user.email_confirmed_at) {
      await ensureUserProfile({
        id: data.user.id,
        name,
        avatar: avatarUrl,
        phone: phone ?? undefined,
      })

      const user = await getAuthenticatedUser()
      if (user) {
        return NextResponse.json(
          {
            message: 'Account created successfully.',
            user: toPublicUser(user),
            email,
            needsEmailVerification: false,
          },
          { status: 201 },
        )
      }
    }

    return NextResponse.json(
      {
        message: `Check ${email} for the confirmation link. You can sign in after you confirm your email.`,
        email,
        needsEmailVerification: true,
      },
      { status: 201 },
    )
  }

  if (error && isDuplicateEmailError(error.message)) {
    return NextResponse.json(
      { error: 'An account with this email already exists. Please sign in instead.' },
      { status: 409 },
    )
  }

  // Fallback path when Supabase built-in SMTP fails ("Error sending confirmation email" or rate limit):
  // Generate a signed Supabase confirmation link with Admin API and deliver it via Resend.
  if (error && isConfirmationEmailError(error.message) && hasServiceRole) {
    try {
      const admin = createAdminClient()

      const signupLinkRes = await admin.auth.admin.generateLink({
        type: 'signup',
        email,
        password,
        options: {
          redirectTo,
          data: userMetadata,
        },
      })

      if (signupLinkRes.error && isDuplicateEmailError(signupLinkRes.error.message)) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please sign in instead.' },
          { status: 409 },
        )
      }

      if (!signupLinkRes.error && signupLinkRes.data?.user) {
        const generatedUserId = signupLinkRes.data.user.id
        const confirmUrl = buildAuthCallbackUrl({
          origin,
          hashedToken: signupLinkRes.data.properties?.hashed_token,
          verificationType: signupLinkRes.data.properties?.verification_type,
          fallbackActionLink: signupLinkRes.data.properties?.action_link,
          nextPath: '/dashboard',
        })

        const emailDelivery = await sendTransactionalEmailWithResult({
          to: email,
          subject: 'Confirm your GrossThrift email address',
          heading: `Welcome to GrossThrift, ${name}!`,
          body: 'Click the button below to confirm your email address and activate your GrossThrift account. This link expires after use.',
          ctaLabel: 'Confirm Email Address',
          ctaUrl: confirmUrl,
        })

        if (emailDelivery.ok) {
          return NextResponse.json(
            {
              message: `Check ${email} for the confirmation link. You can sign in after you confirm your email.`,
              email,
              needsEmailVerification: true,
            },
            { status: 201 },
          )
        }

        // Remove the newly created unverified auth user so failed delivery does not lock the email.
        try {
          await admin.auth.admin.deleteUser(generatedUserId)
        } catch (cleanupErr) {
          console.warn('Failed to clean up unverified user after email error:', cleanupErr)
        }

        if (process.env.NODE_ENV !== 'production') {
          console.info(`[DEV Signup Confirmation Link for ${email}]: ${confirmUrl}`)
        }

        return NextResponse.json(
          {
            error:
              emailDelivery.error?.includes('only send testing emails')
                ? 'Resend sandbox mode only delivers to your own Resend account email until a custom domain is verified (set RESEND_FROM_EMAIL) or custom SMTP is configured in Supabase Auth.'
                : `Confirmation email could not be delivered: ${emailDelivery.error || 'Email delivery failed.'}`,
          },
          { status: 502 },
        )
      }
    } catch (fallbackErr) {
      console.error('Signup email fallback failed:', fallbackErr)
    }
  }

  return NextResponse.json(
    { error: error?.message || 'Unable to create your account.' },
    { status: 400 },
  )
}
