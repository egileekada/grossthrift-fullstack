import { NextResponse } from 'next/server'
import { getAuthenticatedUser, isSupabaseConfigured, toPublicUser } from '@/lib/server/db'
import { createClient } from '@/lib/supabase/server'

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
  if (input.provider && input.provider !== 'email') {
    return NextResponse.json({ error: 'Use email and password to sign in.' }, { status: 400 })
  }
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : ''
  const password = typeof input.password === 'string' ? input.password : ''
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Account sign-in is not configured yet.' }, { status: 503 })
  }

  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.user) {
    const unverified = error?.message.toLowerCase().includes('email not confirmed')
    return NextResponse.json(
      { error: unverified ? 'Confirm your email before signing in.' : 'Invalid email or password.' },
      { status: unverified ? 403 : 401 },
    )
  }

  if (!data.user.email_confirmed_at) {
    await supabase.auth.signOut()
    return NextResponse.json({ error: 'Confirm your email before signing in.' }, { status: 403 })
  }

  const user = await getAuthenticatedUser()
  if (!user) {
    await supabase.auth.signOut()
    return NextResponse.json({ error: 'Your verified account could not be loaded.' }, { status: 500 })
  }

  return NextResponse.json({ user: toPublicUser(user) })
}
