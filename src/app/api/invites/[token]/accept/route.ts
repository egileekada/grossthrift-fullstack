import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

export async function POST(
  _request: Request,
  { params }: { params: { token: string } },
) {
  if (!TOKEN_PATTERN.test(params.token)) {
    return NextResponse.json({ error: 'Invite link not found or no longer available' }, { status: 404 })
  }

  const supabase = createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Sign in first' }, { status: 401 })
  }

  if (!user.email_confirmed_at) {
    return NextResponse.json(
      { error: 'Verify your email before joining a listing' },
      { status: 403 },
    )
  }

  const tokenHash = createHash('sha256').update(params.token).digest('hex')
  const { data, error } = await supabase.rpc('accept_private_invite', {
    p_token_hash: tokenHash,
  })

  if (error) {
    const status =
      error.code === 'P0002'
        ? 404
        : error.code === '23505'
          ? 409
          : error.code === '28000'
            ? 401
            : error.code === '42501'
              ? 403
              : error.code === '22023'
                ? 409
                : 500

    if (status === 500) {
      console.error('POST /api/invites/[token]/accept failed:', error.message)
      return NextResponse.json({ error: 'Unable to reserve a seat' }, { status })
    }

    return NextResponse.json({ error: error.message }, { status })
  }

  return NextResponse.json(
    {
      data: {
        id: data.id,
        listing_id: data.listing_id,
        status: data.status,
        price_per_seat: data.price_per_seat,
        seat_expires_at: data.seat_expires_at,
      },
      next: 'checkout',
    },
    { status: 201, headers: { 'Cache-Control': 'no-store' } },
  )
}
