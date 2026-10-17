import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Send valid JSON.' }, { status: 400 })
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }
  const email = typeof (body as Record<string, unknown>).email === 'string'
    ? ((body as Record<string, string>).email).trim().toLowerCase()
    : ''
  if (!email || !email.includes('@') || email.length > 254) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }
  const supabase = createClient()
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: new URL('/auth/callback?next=/reset-password', request.url).toString(),
  })
  return NextResponse.json({
    message: 'If an account uses that email, a password reset link has been sent.',
  })
}
