import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const page = Number(params.get('page') ?? '1')
  const pageSize = Number(params.get('pageSize') ?? '20')
  const category = params.get('category')?.trim()
  const search = params.get('search')?.trim()
  const sort = params.get('sort') ?? 'newest'
  const minPrice = params.has('minPrice') ? Number(params.get('minPrice')) : undefined
  const maxPrice = params.has('maxPrice') ? Number(params.get('maxPrice')) : undefined

  if (
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > 50 ||
    !['newest', 'price_asc', 'price_desc'].includes(sort) ||
    (minPrice !== undefined && (!Number.isFinite(minPrice) || minPrice < 0)) ||
    (maxPrice !== undefined && (!Number.isFinite(maxPrice) || maxPrice < 0)) ||
    (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) ||
    (category && category.length > 100) ||
    (search && search.length > 100)
  ) {
    return NextResponse.json(
      { error: 'Invalid listing filters or pagination values' },
      { status: 400 },
    )
  }

  const supabase = createClient()
  const from = (page - 1) * pageSize

  let query = supabase
    .from('listings')
    .select(
      `
        id,
        host_type,
        service_id,
        plan_type,
        total_cost,
        billing_cycle,
        seats_total,
        seats_open,
        price_per_seat,
        description,
        rules,
        created_at,
        services!inner (
          name,
          category,
          logo_url,
          sharing_policy_note
        )
      `,
      { count: 'exact' },
    )
    .eq('visibility', 'public')
    .eq('status', 'active')

  if (category) query = query.eq('services.category', category)
  if (search) query = query.ilike('services.name', `%${search}%`)
  if (minPrice !== undefined) query = query.gte('price_per_seat', minPrice)
  if (maxPrice !== undefined) query = query.lte('price_per_seat', maxPrice)

  if (sort === 'price_asc') {
    query = query.order('price_per_seat', { ascending: true })
  } else if (sort === 'price_desc') {
    query = query.order('price_per_seat', { ascending: false })
  } else {
    query = query.order('created_at', { ascending: false })
  }

  const { data, error, count } = await query.range(
    from,
    from + pageSize - 1,
  )

  if (error) {
    console.error('GET /api/listings failed:', error.message)
    return NextResponse.json(
      { error: 'Unable to load listings' },
      { status: 500 },
    )
  }

  return NextResponse.json({
    data,
    pagination: {
      page,
      pageSize,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    },
  })
}


export async function POST(request: Request) {
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
      { error: 'Verify your email before creating a listing' },
      { status: 403 },
    )
  }

  const [profileResult, privateProfileResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('profile_private')
      .select('phone')
      .eq('id', user.id)
      .maybeSingle(),
  ])

  if (profileResult.error || privateProfileResult.error) {
    return NextResponse.json(
      { error: 'Could not check your profile details' },
      { status: 500 },
    )
  }

  if (
    !profileResult.data?.display_name?.trim() ||
    !privateProfileResult.data?.phone?.trim()
  ) {
    return NextResponse.json(
      { error: 'Add your display name and phone number to your profile before creating a listing' },
      { status: 403 },
    )
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
  const serviceId = input.service_id
  const planType = input.plan_type
  const billingCycle = input.billing_cycle
  const totalCost = input.total_cost
  const seatsTotal = input.seats_total
  const pricePerSeat = input.price_per_seat
  const description = input.description
  const rules = input.rules
  const visibility = input.visibility

  if (
    typeof serviceId !== 'string' ||
    typeof planType !== 'string' ||
    !planType.trim() ||
    typeof billingCycle !== 'string' ||
    !billingCycle.trim() ||
    typeof totalCost !== 'number' ||
    !Number.isFinite(totalCost) ||
    totalCost <= 0 ||
    typeof seatsTotal !== 'number' ||
    !Number.isInteger(seatsTotal) ||
    seatsTotal < 1 ||
    typeof pricePerSeat !== 'number' ||
    !Number.isFinite(pricePerSeat) ||
    pricePerSeat <= 0 ||
    typeof rules !== 'string' ||
    !rules.trim() ||
    !['private', 'public'].includes(String(visibility)) ||
    input.host_attested !== true ||
    (description !== undefined && typeof description !== 'string')
  ) {
    return NextResponse.json(
      { error: 'Listing details are missing or invalid' },
      { status: 400 },
    )
  }

  const { data: service, error: serviceError } = await supabase
    .from('services')
    .select('id')
    .eq('id', serviceId)
    .eq('is_active', true)
    .maybeSingle()

  if (serviceError || !service) {
    return NextResponse.json(
      { error: 'Choose an active service from the catalog' },
      { status: 400 },
    )
  }

  const { data: listing, error } = await supabase
    .from('listings')
    .insert({
      host_type: 'user',
      host_id: user.id,
      service_id: serviceId,
      plan_type: planType.trim(),
      total_cost: totalCost,
      billing_cycle: billingCycle.trim(),
      seats_total: seatsTotal,
      seats_open: seatsTotal,
      price_per_seat: pricePerSeat,
      description:
        typeof description === 'string' ? description.trim() || null : null,
      rules: rules.trim(),
      status: 'active',
      visibility,
      host_attested: true,
    })
    .select('id, service_id, plan_type, price_per_seat, seats_open, status, visibility')
    .single()

  if (error) {
    console.error('POST /api/listings failed:', error.message)
    return NextResponse.json(
      { error: 'Unable to create listing' },
      { status: 500 },
    )
  }

  return NextResponse.json({ data: listing }, { status: 201 })
}
