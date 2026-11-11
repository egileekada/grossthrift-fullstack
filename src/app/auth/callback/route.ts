import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_OTP_TYPES = new Set<EmailOtpType>([
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
])

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
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
        return NextResponse.redirect(new URL(next, requestUrl.origin))
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
        return NextResponse.redirect(new URL(next, requestUrl.origin))
      }
      await supabase.auth.signOut()
    }
  }

  return NextResponse.redirect(
    new URL('/auth/login?auth_error=confirmation_failed', requestUrl.origin),
  )
}
