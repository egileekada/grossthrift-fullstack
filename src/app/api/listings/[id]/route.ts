import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient()

  const { data: listing, error } = await supabase
    .from('listings')
    .select(`
      id,
      host_type,
      host_id,
      service_id,
      plan_type,
      total_cost,
      billing_cycle,
      seats_total,
      seats_open,
      price_per_seat,
      description,
      rules,
      status,
      visibility,
      created_at,
      services!inner (
        name,
        category,
        logo_url,
        sharing_policy_note
      )
    `)
    .eq('id', params.id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: 'Unable to load this listing' }, { status: 500 })
  }

  if (!listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  }

  let host: {
    display_name: string | null
    avatar_url: string | null
    rating_avg: number | null
    completed_splits: number
    is_official: boolean
  } | null = null

  if (listing.host_type === 'official') {
    host = {
      display_name: 'GrossThrift',
      avatar_url: null,
      rating_avg: null,
      completed_splits: 0,
      is_official: true,
    }
  } else if (listing.host_id) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('display_name, avatar_url, rating_avg, completed_splits')
      .eq('id', listing.host_id)
      .maybeSingle()

    if (profileError) {
      return NextResponse.json({ error: 'Unable to load the Host profile' }, { status: 500 })
    }

    if (profile) {
      host = { ...profile, is_official: false }
    }
  }

  return NextResponse.json({
    data: {
      id: listing.id,
      host_type: listing.host_type,
      service_id: listing.service_id,
      plan_type: listing.plan_type,
      total_cost: listing.total_cost,
      billing_cycle: listing.billing_cycle,
      seats_total: listing.seats_total,
      seats_open: listing.seats_open,
      price_per_seat: listing.price_per_seat,
      description: listing.description,
      rules: listing.rules,
      status: listing.status,
      visibility: listing.visibility,
      created_at: listing.created_at,
      service: listing.services,
      host,
    },
  })
}
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
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

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const input = body as Record<string, unknown>
  const allowedFields = ['description', 'rules', 'price_per_seat', 'status']

  if (
    Object.keys(input).length === 0 ||
    Object.keys(input).some((field) => !allowedFields.includes(field))
  ) {
    return NextResponse.json({ error: 'Unsupported listing changes' }, { status: 400 })
  }

  const updates: Record<string, string | number | null> = {}

  if ('description' in input) {
    if (input.description !== null && typeof input.description !== 'string') {
      return NextResponse.json({ error: 'Description must be text' }, { status: 400 })
    }
    updates.description =
      typeof input.description === 'string' ? input.description.trim() || null : null
  }

  if ('rules' in input) {
    if (typeof input.rules !== 'string' || !input.rules.trim()) {
      return NextResponse.json({ error: 'Rules cannot be empty' }, { status: 400 })
    }
    updates.rules = input.rules.trim()
  }

  if ('price_per_seat' in input) {
    if (
      typeof input.price_per_seat !== 'number' ||
      !Number.isFinite(input.price_per_seat) ||
      input.price_per_seat <= 0
    ) {
      return NextResponse.json({ error: 'Price must be greater than zero' }, { status: 400 })
    }
    updates.price_per_seat = input.price_per_seat
  }

  if ('status' in input) {
    if (!['active', 'paused', 'closed'].includes(String(input.status))) {
      return NextResponse.json({ error: 'Status must be active, paused, or closed' }, { status: 400 })
    }
    updates.status = String(input.status)
  }

  const { data, error } = await supabase
    .from('listings')
    .update(updates)
    .eq('id', params.id)
    .eq('host_id', user.id)
    .select('id, description, rules, price_per_seat, status')
    .maybeSingle()

  if (error?.code === '23514') {
    return NextResponse.json(
      { error: 'Price cannot change while members are active in this split' },
      { status: 409 },
    )
  }

  if (error) {
    return NextResponse.json({ error: 'Could not update listing' }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Listing not found or you are not its host' }, { status: 404 })
  }

  return NextResponse.json({ data })
}



