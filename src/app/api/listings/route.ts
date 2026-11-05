import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser, normalizeCurrency } from '@/lib/server/db';
import { mapDiscoveryListing } from '@/lib/server/listingMappers';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const page = Number(params.get('page') ?? '1');
  const pageSize = Number(params.get('pageSize') ?? '50');
  const category = params.get('category')?.trim();
  const search = params.get('search')?.trim();
  const sort = params.get('sort') ?? 'newest';
  const minPrice = params.has('minPrice') ? Number(params.get('minPrice')) : undefined;
  const maxPrice = params.has('maxPrice') ? Number(params.get('maxPrice')) : undefined;

  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    return NextResponse.json({ error: 'Invalid listing pagination values.' }, { status: 400 });
  }

  const supabase = createClient();
  let query = supabase
    .from('listings_with_host')
    .select('*', { count: 'exact' })
    .eq('status', 'active')
    .eq('visibility', 'public');

  if (category && category !== 'All') query = query.ilike('service_category', category);
  if (search) {
    const term = `%${search.replace(/[%_,]/g, ' ')}%`;
    query = query.or(`service_name.ilike.${term},plan_type.ilike.${term},description.ilike.${term},host_display_name.ilike.${term}`);
  }
  if (minPrice !== undefined && Number.isFinite(minPrice)) query = query.gte('price_per_seat', minPrice);
  if (maxPrice !== undefined && Number.isFinite(maxPrice)) query = query.lte('price_per_seat', maxPrice);

  const orderColumn = sort === 'price_asc' || sort === 'price_desc' ? 'price_per_seat' : 'created_at';
  const { data: rows, error, count } = await query
    .order(orderColumn, { ascending: sort === 'price_asc' })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (error) return NextResponse.json({ error: 'Could not load listings.' }, { status: 500 });

  const publicRows = rows ?? [];

  const authUser = await getAuthenticatedUser();
  let hostedIds: string[] = [];
  let memberships: Array<{ listing_id: string; status: string }> = [];
  if (authUser) {
    const [hostedResult, membershipsResult] = await Promise.all([
      supabase.from('listings').select('id').eq('host_id', authUser.id),
      supabase.from('memberships').select('listing_id,status').eq('member_id', authUser.id),
    ]);
    if (hostedResult.error || membershipsResult.error) {
      return NextResponse.json({ error: 'Could not load your dashboard records.' }, { status: 500 });
    }
    hostedIds = (hostedResult.data ?? []).map((row) => row.id);
    memberships = membershipsResult.data ?? [];
  }

  const joinedListingIds = Array.from(new Set([
    ...hostedIds,
    ...memberships
      .filter((membership) => ['pending_payment', 'paid_and_held', 'invited', 'active', 'disputed'].includes(membership.status))
      .map((membership) => membership.listing_id),
  ]));

  // Browsing remains public-only, while the dashboard also needs records tied
  // to this authenticated account (for example, private listings it hosts).
  const publicIds = new Set(publicRows.map((row) => row.id));
  const relatedIds = joinedListingIds.filter((id) => !publicIds.has(id));
  let relatedRows: typeof publicRows = [];
  if (relatedIds.length) {
    const { data, error: relatedError } = await supabase
      .from('listings_with_host')
      .select('*')
      .in('id', relatedIds);
    if (relatedError) return NextResponse.json({ error: 'Could not load your related listings.' }, { status: 500 });
    relatedRows = data ?? [];
  }

  const allRows = [...publicRows, ...relatedRows];
  const ids = Array.from(new Set(allRows.map((row) => row.id)));
  const { data: identities, error: identityError } = ids.length
    ? await supabase.from('listings').select('id, host_id, currency').in('id', ids)
    : { data: [], error: null };
  if (identityError) return NextResponse.json({ error: 'Could not load listing ownership details.' }, { status: 500 });
  const identityById = new Map((identities ?? []).map((row) => [row.id, row]));
  const listings = allRows.map((row) => {
    const identity = identityById.get(row.id);
    return mapDiscoveryListing(row, { hostId: identity?.host_id, currency: identity?.currency });
  });

  return NextResponse.json({
    data: listings,
    joinedListingIds,
    joinRequests: [],
    notifications: [],
    pagination: {
      page,
      pageSize,
      total: count ?? listings.length,
      totalPages: Math.ceil((count ?? listings.length) / pageSize),
    },
  });
}

export async function POST(request: Request) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) return NextResponse.json({ error: 'Please verify your email and sign in before creating a listing.' }, { status: 401 });

  let input: Record<string, unknown>;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const planName = typeof input.planName === 'string' ? input.planName.trim() : '';
  const totalCost = Number(input.totalCost ?? 0);
  const seatsTotal = Number(input.slotsTotal ?? 0);
  const currency = normalizeCurrency(typeof input.currency === 'string' ? input.currency : undefined);
  if (!planName) return NextResponse.json({ error: 'Please provide a subscription plan name.' }, { status: 400 });
  if (!Number.isFinite(totalCost) || totalCost <= 0) return NextResponse.json({ error: 'Total cost must be greater than 0.' }, { status: 400 });
  if (!Number.isInteger(seatsTotal) || seatsTotal < 2 || seatsTotal > 20) return NextResponse.json({ error: 'Number of people splitting must be between 2 and 20.' }, { status: 400 });
  if (currency !== 'NGN') return NextResponse.json({ error: 'The MVP currently creates listings in NGN only.' }, { status: 400 });
  if (input.hostAttested !== true) return NextResponse.json({ error: 'Please accept the listing and sharing terms.' }, { status: 400 });

  const supabase = createClient();
  const { data: services, error: servicesError } = await supabase
    .from('services')
    .select('id,name')
    .eq('is_active', true);
  if (servicesError) return NextResponse.json({ error: 'Could not verify the selected service.' }, { status: 500 });

  const normalizedPlan = planName.toLowerCase();
  const service = (services ?? []).find((item) => {
    const normalizedName = item.name.toLowerCase();
    return normalizedPlan === normalizedName || normalizedPlan.startsWith(`${normalizedName} `);
  });
  if (!service) return NextResponse.json({ error: 'Choose one of the active services in the catalog.' }, { status: 400 });

  const description = typeof input.description === 'string' ? input.description.trim() : '';
  const rules = typeof input.rules === 'string' ? input.rules.trim() : '';
  const billingCycle = typeof input.billingCycle === 'string' ? input.billingCycle : 'monthly';
  const { data: created, error: insertError } = await supabase
    .from('listings')
    .insert({
      host_type: 'community',
      host_id: authUser.id,
      service_id: service.id,
      plan_type: planName,
      total_cost: totalCost,
      billing_cycle: billingCycle,
      seats_total: seatsTotal,
      seats_open: seatsTotal - 1,
      price_per_seat: Number((totalCost / seatsTotal).toFixed(2)),
      currency,
      description: description || `Shared subscription group for ${planName}.`,
      rules,
      status: 'active',
      visibility: 'public',
      host_attested: true,
    })
    .select('id,host_id,currency')
    .single();

  if (insertError || !created) return NextResponse.json({ error: 'Could not create the listing.' }, { status: 500 });

  const { data: row, error: readError } = await supabase
    .from('listings_with_host')
    .select('*')
    .eq('id', created.id)
    .single();
  if (readError || !row) return NextResponse.json({ error: 'Listing was created, but could not be loaded.' }, { status: 500 });

  return NextResponse.json({
    data: mapDiscoveryListing(row, { hostId: created.host_id, currency: created.currency }),
  }, { status: 201 });
}
