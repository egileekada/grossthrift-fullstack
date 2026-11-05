import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/server/db';
import { createAdminClient } from '@/lib/server/supabaseAdmin';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) {
    return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  }

  const client =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createAdminClient()
      : createClient();

  // Support passing either membership.id or listing_id
  let { data: membership } = await client
    .from('memberships')
    .select('id, listing_id, member_id, status')
    .eq('id', params.id)
    .maybeSingle();

  if (!membership) {
    const byListing = await client
      .from('memberships')
      .select('id, listing_id, member_id, status')
      .eq('listing_id', params.id)
      .eq('member_id', authUser.id)
      .in('status', ['pending_payment', 'paid_and_held', 'invited', 'active'])
      .maybeSingle();
    membership = byListing.data;
  }

  if (!membership) {
    return NextResponse.json({ error: 'Active membership not found.' }, { status: 404 });
  }

  const { data: listing } = await client
    .from('listings')
    .select('id, host_id, seats_total, seats_open, status')
    .eq('id', membership.listing_id)
    .maybeSingle();

  const isMember = membership.member_id === authUser.id;
  const isHost = Boolean(listing && listing.host_id === authUser.id);
  if (!isMember && !isHost) {
    return NextResponse.json({ error: 'Not authorized to modify this membership.' }, { status: 403 });
  }

  const now = new Date().toISOString();
  const { error: updateError } = await client
    .from('memberships')
    .update({
      status: 'left',
      left_at: now,
      seat_expires_at: null,
      updated_at: now,
    })
    .eq('id', membership.id);

  if (updateError) {
    return NextResponse.json({ error: 'Could not leave split.' }, { status: 500 });
  }

  if (listing) {
    const nextOpen = Math.min(Number(listing.seats_total), Number(listing.seats_open) + 1);
    await client
      .from('listings')
      .update({
        seats_open: nextOpen,
        status: listing.status === 'full' ? 'active' : listing.status,
        updated_at: now,
      })
      .eq('id', listing.id);
  }

  return NextResponse.json({ message: 'You have left the split and the seat has been released.' });
}

