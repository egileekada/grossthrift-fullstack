import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const requestedNext = requestUrl.searchParams.get('next') ?? '/dashboard'
  const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/dashboard'

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (!userError && user?.email_confirmed_at) {
        return NextResponse.redirect(new URL(next, requestUrl.origin))
      }
      await supabase.auth.signOut()
    }
  }

  return NextResponse.redirect(new URL('/auth/login?auth_error=confirmation_failed', requestUrl.origin))
}
