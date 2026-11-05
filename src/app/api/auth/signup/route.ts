import { NextResponse } from 'next/server'
import {
  ensureUserProfile,
  getAuthenticatedUser,
  isSupabaseConfigured,
  toPublicUser,
} from '@/lib/server/db'
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
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : ''
  const password = typeof input.password === 'string' ? input.password : ''
  const name = typeof input.name === 'string' ? input.name.trim() : ''
  const phone = typeof input.phone === 'string' && input.phone.trim() ? input.phone.trim() : null
  const country = typeof input.country === 'string' && input.country.trim() ? input.country.trim() : 'Nigeria'
  const countryFlag = typeof input.countryFlag === 'string' && input.countryFlag.trim() ? input.countryFlag.trim() : '🇳🇬'

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

  const supabase = createClient()
  const redirectTo = new URL('/auth/callback?next=/dashboard', request.url).toString()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectTo,
      data: { display_name: name, name, phone, country, country_flag: countryFlag },
    },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  if (!data.user) {
    return NextResponse.json({ error: 'Unable to create your account.' }, { status: 500 })
  }

  await ensureUserProfile({
    id: data.user.id,
    name,
    avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
  })

  if (data.session) {
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

