import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { ensureUserProfile } from '@/lib/server/db'
import { getRequestOrigin } from '@/lib/server/siteUrl'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_OTP_TYPES = new Set<EmailOtpType>([
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
])

async function syncConfirmedUserProfile(user: {
  id: string
  email?: string
  user_metadata?: Record<string, unknown>
}) {
  const metadata = user.user_metadata ?? {}
  const name =
    (typeof metadata.display_name === 'string' && metadata.display_name.trim()) ||
    (typeof metadata.name === 'string' && metadata.name.trim()) ||
    user.email?.split('@')[0] ||
    'Member'
  const avatar =
    typeof metadata.avatar_url === 'string' && metadata.avatar_url.trim()
      ? metadata.avatar_url.trim()
      : undefined
  const phone =
    typeof metadata.phone === 'string' && metadata.phone.trim()
      ? metadata.phone.trim()
      : undefined

  await ensureUserProfile({
    id: user.id,
    name,
    avatar,
    phone,
  })
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const redirectOrigin = getRequestOrigin(request)
  const code = requestUrl.searchParams.get('code')
  const tokenHash = requestUrl.searchParams.get('token_hash')
  const typeParam = requestUrl.searchParams.get('type') as EmailOtpType | null
  const requestedNext = requestUrl.searchParams.get('next') ?? '/dashboard'
  const next =
    requestedNext.startsWith('/') && !requestedNext.startsWith('//')
      ? requestedNext
      : '/dashboard'

  const supabase = createClient()

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()
      if (!userError && user?.email_confirmed_at) {
        await syncConfirmedUserProfile(user)
        return NextResponse.redirect(new URL(next, redirectOrigin))
      }
      await supabase.auth.signOut()
    }
  } else if (tokenHash && typeParam && ALLOWED_OTP_TYPES.has(typeParam)) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: typeParam,
    })
    if (!error) {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()
      if (!userError && user?.email_confirmed_at) {
        await syncConfirmedUserProfile(user)
        return NextResponse.redirect(new URL(next, redirectOrigin))
      }
      await supabase.auth.signOut()
    }
  }

  return NextResponse.redirect(
    new URL('/auth/login?auth_error=confirmation_failed', redirectOrigin),
  )
}
