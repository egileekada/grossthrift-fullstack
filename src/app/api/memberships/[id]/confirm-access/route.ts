import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/server/db';
import { createAdminClient } from '@/lib/server/supabaseAdmin';
import { createClient } from '@/lib/supabase/server';
import { createInAppNotification, sendTransactionalEmail } from '@/lib/server/email';
import { getSiteUrl } from '@/lib/server/siteUrl';

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

  const { data: membership, error: readError } = await client
    .from('memberships')
    .select('id, listing_id, member_id, status, price_per_seat')
    .eq('id', params.id)
    .maybeSingle();

  if (readError || !membership) {
    return NextResponse.json({ error: 'Membership not found.' }, { status: 404 });
  }

  if (membership.member_id !== authUser.id) {
    return NextResponse.json(
      { error: 'Only the seat member can confirm access.' },
      { status: 403 }
    );
  }

  if (!['paid_and_held', 'invited'].includes(membership.status)) {
    return NextResponse.json(
      { error: `Cannot confirm access when membership status is "${membership.status}".` },
      { status: 409 }
    );
  }

  const { data: listing } = await client
    .from('listings')
    .select('id, host_id, plan_type')
    .eq('id', membership.listing_id)
    .maybeSingle();

  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await client
    .from('memberships')
    .update({
      status: 'active',
      access_confirmed_at: now,
      updated_at: now,
    })
    .eq('id', params.id)
    .select('*')
    .single();

  if (updateError || !updated) {
    return NextResponse.json({ error: 'Could not confirm access.' }, { status: 500 });
  }

  const seatPrice = Number(membership.price_per_seat ?? 0);

  // Release held balance to host's available wallet balance & increment completed_splits
  if (listing?.host_id) {
    try {
      const { data: wallet } = await client
        .from('wallets')
        .select('available_balance, held_balance')
        .eq('user_id', listing.host_id)
        .maybeSingle();

      const nextHeld = Math.max(0, Number(wallet?.held_balance ?? seatPrice) - seatPrice);
      const nextAvailable = Number(wallet?.available_balance ?? 0) + seatPrice;

      await client.from('wallets').upsert(
        {
          user_id: listing.host_id,
          held_balance: nextHeld,
          available_balance: nextAvailable,
          updated_at: now,
        },
        { onConflict: 'user_id' }
      );

      await client.from('wallet_transactions').insert({
        user_id: listing.host_id,
        membership_id: membership.id,
        type: 'release_to_available',
        amount: seatPrice,
        status: 'completed',
        description: `Escrow released after ${authUser.name} confirmed access to ${listing.plan_type}`,
      });
    } catch {
      // Optional wallet table sync
    }

    try {
      const { data: hostProfile } = await client
        .from('profiles')
        .select('completed_splits')
        .eq('id', listing.host_id)
        .maybeSingle();
      await client
        .from('profiles')
        .update({ completed_splits: Number(hostProfile?.completed_splits ?? 0) + 1 })
        .eq('id', listing.host_id);
    } catch {
      // Non-blocking profile counter update
    }

    await createInAppNotification({
      userId: listing.host_id,
      type: 'access_confirmed',
      title: `${authUser.name} confirmed access — ₦${seatPrice.toFixed(2)} released to your wallet`,
      body: `Funds for ${listing.plan_type} are now in your Available Wallet Balance and ready for bank withdrawal.`,
      link: '/dashboard',
    });

    if (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const admin = createAdminClient();
        const { data: hostAuth } = await admin.auth.admin.getUserById(listing.host_id);
        if (hostAuth?.user?.email) {
          await sendTransactionalEmail({
            to: hostAuth.user.email,
            subject: `₦${seatPrice.toFixed(2)} Released to Your GrossThrift Wallet!`,
            heading: `${authUser.name} confirmed access to ${listing.plan_type}`,
            body: `Great news! Your member confirmed access, and ₦${seatPrice.toFixed(2)} has been released from escrow into your Available Wallet Balance.`,
            ctaLabel: 'View Wallet & Withdraw',
            ctaUrl: `${getSiteUrl()}/dashboard?tab=wallet`,
          });
        }
      } catch {
        // Non-blocking email
      }
    }
  }

  return NextResponse.json({
    message: 'Access confirmed! Host payout has been released from escrow.',
    data: updated,
  });
}

