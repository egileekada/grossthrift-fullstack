import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/server/db';
import { createAdminClient } from '@/lib/server/supabaseAdmin';
import { createClient } from '@/lib/supabase/server';

export async function PATCH() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  return NextResponse.json(
    { error: 'Join requests are no longer used. Members reserve seats through Paystack checkout.' },
    { status: 409 },
  );
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });

  const client =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createAdminClient()
      : createClient();

  // 1. Check if params.id is a listing hosted by this user
  const { data: listing } = await client
    .from('listings')
    .select('id, host_id, seats_total, seats_open')
    .eq('id', params.id)
    .maybeSingle();

  if (listing && listing.host_id === user.id) {
    const { count } = await client
      .from('memberships')
      .select('id', { count: 'exact', head: true })
      .eq('listing_id', listing.id)
      .in('status', ['paid_and_held', 'invited', 'active', 'disputed']);

    if ((count ?? 0) > 0) {
      // Cancel listing instead of hard-deleting when active members exist
      await client
        .from('listings')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', listing.id);
      return NextResponse.json({
        message: 'Listing cancelled.',
        deletedListingId: listing.id,
      });
    }

    await client.from('listings').delete().eq('id', listing.id);
    return NextResponse.json({
      message: 'Listing deleted.',
      deletedListingId: listing.id,
    });
  }

  // 2. Otherwise check if the user is leaving a membership (by membership id or listing id)
  let { data: membership } = await client
    .from('memberships')
    .select('id, listing_id, member_id, status')
    .eq('id', params.id)
    .maybeSingle();

  if (!membership && listing) {
    const byListing = await client
      .from('memberships')
      .select('id, listing_id, member_id, status')
      .eq('listing_id', listing.id)
      .eq('member_id', user.id)
      .in('status', ['pending_payment', 'paid_and_held', 'invited', 'active'])
      .maybeSingle();
    membership = byListing.data;
  }

  if (membership && (membership.member_id === user.id || (listing && listing.host_id === user.id))) {
    const now = new Date().toISOString();
    await client
      .from('memberships')
      .update({
        status: 'left',
        left_at: now,
        seat_expires_at: null,
        updated_at: now,
      })
      .eq('id', membership.id);

    const targetListing =
      listing ||
      (
        await client
          .from('listings')
          .select('id, seats_total, seats_open, status')
          .eq('id', membership.listing_id)
          .maybeSingle()
      ).data;

    if (targetListing) {
      const nextOpen = Math.min(
        Number(targetListing.seats_total),
        Number(targetListing.seats_open) + 1
      );
      await client
        .from('listings')
        .update({
          seats_open: nextOpen,
          status: 'active',
          updated_at: now,
        })
        .eq('id', targetListing.id);
    }

    return NextResponse.json({ message: 'Left split successfully.' });
  }

  return NextResponse.json({ error: 'Record not found.' }, { status: 404 });
}
