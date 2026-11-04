import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser, normalizeCurrency } from '@/lib/server/db';
import { mapDiscoveryListing } from '@/lib/server/listingMappers';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data: row, error }, { data: identity }] = await Promise.all([
    supabase.from('listings_with_host').select('*').eq('id', params.id).maybeSingle(),
    supabase.from('listings').select('id,host_id,currency').eq('id', params.id).maybeSingle(),
  ]);
  if (error) return NextResponse.json({ error: 'Could not load listing.' }, { status: 500 });
  if (!row || !identity) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
  return NextResponse.json({ data: mapDiscoveryListing(row, { hostId: identity.host_id, currency: identity.currency }) });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const supabase = createClient();
  const { data: current, error: readError } = await supabase
    .from('listings')
    .select('id,host_id,seats_total,total_cost,currency')
    .eq('id', params.id)
    .eq('host_id', authUser.id)
    .maybeSingle();
  if (readError) return NextResponse.json({ error: 'Could not load listing.' }, { status: 500 });
  if (!current) return NextResponse.json({ error: 'Listing not found or you are not its host.' }, { status: 404 });

  const updates: Record<string, unknown> = {};
  if (typeof body.description === 'string') updates.description = body.description.trim();
  if (typeof body.rules === 'string') updates.rules = body.rules.trim();
  if (typeof body.totalCost === 'number' && body.totalCost > 0) {
    updates.total_cost = body.totalCost;
    updates.price_per_seat = Number((body.totalCost / current.seats_total).toFixed(2));
  }
  if (typeof body.currency === 'string') updates.currency = normalizeCurrency(body.currency);
  if (!Object.keys(updates).length) return NextResponse.json({ error: 'No valid listing changes provided.' }, { status: 400 });

  const { error: updateError } = await supabase
    .from('listings')
    .update(updates)
    .eq('id', params.id)
    .eq('host_id', authUser.id);
  if (updateError) return NextResponse.json({ error: updateError.message.includes('Price cannot change') ? updateError.message : 'Could not update listing.' }, { status: updateError.message.includes('Price cannot change') ? 409 : 500 });

  const [{ data: row }, { data: identity }] = await Promise.all([
    supabase.from('listings_with_host').select('*').eq('id', params.id).single(),
    supabase.from('listings').select('id,host_id,currency').eq('id', params.id).single(),
  ]);
  if (!row || !identity) return NextResponse.json({ error: 'Listing updated, but could not be loaded.' }, { status: 500 });
  return NextResponse.json({ data: mapDiscoveryListing(row, { hostId: identity.host_id, currency: identity.currency }) });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });

  const supabase = createClient();
  const { data: listing } = await supabase
    .from('listings')
    .select('id,host_id')
    .eq('id', params.id)
    .maybeSingle();
  if (!listing) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
  if (listing.host_id !== authUser.id) return NextResponse.json({ error: 'Only the host can delete this listing.' }, { status: 403 });

  const { count, error: membershipError } = await supabase
    .from('memberships')
    .select('id', { count: 'exact', head: true })
    .eq('listing_id', params.id);
  if (membershipError) return NextResponse.json({ error: 'Could not verify listing memberships.' }, { status: 500 });
  if ((count ?? 0) > 0) return NextResponse.json({ error: 'This listing has membership history and cannot be deleted.' }, { status: 409 });

  const { error } = await supabase.from('listings').delete().eq('id', params.id).eq('host_id', authUser.id);
  if (error) return NextResponse.json({ error: 'Could not delete listing.' }, { status: 500 });
  return NextResponse.json({ message: 'Listing deleted.' });
}
