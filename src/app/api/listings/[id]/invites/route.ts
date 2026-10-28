import { createHash, randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const listingId = params.id
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(listingId)
  ) {
    return NextResponse.json({ error: 'Invalid listing ID' }, { status: 400 })
  }

  const supabase = createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Sign in first' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const input = body as Record<string, unknown>
  const expiresInHours = input.expires_in_hours
  const maxUses = input.max_uses
  if (
    typeof expiresInHours !== 'number' ||
    !Number.isInteger(expiresInHours) ||
    expiresInHours < 1 ||
    expiresInHours > 720 ||
    typeof maxUses !== 'number' ||
    !Number.isInteger(maxUses) ||
    maxUses < 1
  ) {
    return NextResponse.json(
      { error: 'Set an expiry from 1 to 720 hours and a positive whole-number use limit' },
      { status: 400 },
    )
  }

  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('id, host_id, visibility, status, seats_open')
    .eq('id', listingId)
    .maybeSingle()

  if (listingError) {
    console.error('POST /api/listings/[id]/invites listing lookup failed:', listingError.message)
    return NextResponse.json({ error: 'Unable to check listing' }, { status: 500 })
  }

  if (!listing || listing.host_id !== user.id) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  }

  if (listing.visibility !== 'private' || !['active', 'full'].includes(listing.status)) {
    return NextResponse.json(
      { error: 'Invite links can only be created for active private listings' },
      { status: 409 },
    )
  }

  if (maxUses > listing.seats_open) {
    return NextResponse.json(
      { error: 'The use limit cannot exceed the listing’s currently open seats' },
      { status: 400 },
    )
  }

  const token = randomBytes(32).toString('base64url')
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString()

  const { data: invite, error: insertError } = await supabase
    .from('invites')
    .insert({
      listing_id: listingId,
      invited_by: user.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
      max_uses: maxUses,
    })
    .select('id, listing_id, status, expires_at, max_uses, use_count, created_at')
    .single()

  if (insertError) {
    console.error('POST /api/listings/[id]/invites insert failed:', insertError.message)
    return NextResponse.json({ error: 'Unable to create invite link' }, { status: 500 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin
  return NextResponse.json(
    {
      data: {
        ...invite,
        invite_url: `${baseUrl.replace(/\/$/, '')}/invite/${token}`,
      },
    },
    { status: 201, headers: { 'Cache-Control': 'no-store' } },
  )
}
