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
  const password = typeof (body as Record<string, unknown>).password === 'string'
    ? (body as Record<string, string>).password
    : ''
  if (password.length < 8 || password.length > 128) {
    return NextResponse.json({ error: 'Password must be between 8 and 128 characters.' }, { status: 400 })
  }
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Open the password reset link before setting a new password.' }, { status: 401 })
  }
  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    return NextResponse.json({ error: 'Could not update the password.' }, { status: 400 })
  }
  return NextResponse.json({ message: 'Password updated.' })
}
