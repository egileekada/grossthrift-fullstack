import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/server/supabaseAdmin';
import { createClient } from '@/lib/supabase/server';
import { createInAppNotification } from '@/lib/server/email';
import { getPaystackSecret, refundPaystackPayment } from '@/lib/server/paystack';
import { reportError, trackEvent } from '@/lib/server/telemetry';

export const dynamic = 'force-dynamic';

// PRD Section 11.4 Scheduled SLA Reconciliation:
// 1. Expire 10-minute 'pending_payment' seat holds and return seats_open.
// 2. Auto-confirm 'invited' memberships after 48 hours if no dispute was opened (ACC-4 / F-33).
// 3. Auto-refund 'paid_and_held' memberships if host did not invite within 24 hours (ACC-3 / F-34).
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const hasServiceRole = Boolean(
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const client = hasServiceRole ? createAdminClient() : createClient();

  const now = new Date();
  const nowIso = now.toISOString();
  const cutoff24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const cutoff48h = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();

  // 1. Expire 10-minute unpaid seat holds
  const { data: expiredHolds } = await client
    .from('memberships')
    .update({
      status: 'left',
      left_at: nowIso,
      seat_expires_at: null,
      updated_at: nowIso,
    })
    .eq('status', 'pending_payment')
    .lte('seat_expires_at', nowIso)
    .select('id, listing_id');

  // 2. Auto-confirm 'invited' memberships older than 48 hours & release escrow to host wallet
  const { data: autoConfirmed } = await client
    .from('memberships')
    .update({
      status: 'active',
      access_confirmed_at: nowIso,
      updated_at: nowIso,
    })
    .eq('status', 'invited')
    .lte('invitation_sent_at', cutoff48h)
    .select('id, listing_id, price_per_seat');

  for (const row of autoConfirmed ?? []) {
    const seatAmount = Number(row.price_per_seat ?? 0);
    if (seatAmount <= 0) continue;
    try {
      const { data: listing } = await client
        .from('listings')
        .select('host_id, plan_type')
        .eq('id', row.listing_id)
        .maybeSingle();

      if (listing?.host_id) {
        const { data: wallet } = await client
          .from('wallets')
          .select('held_balance, available_balance')
          .eq('user_id', listing.host_id)
          .maybeSingle();

        await client.from('wallets').upsert(
          {
            user_id: listing.host_id,
            held_balance: Math.max(0, Number(wallet?.held_balance ?? 0) - seatAmount),
            available_balance: Number(wallet?.available_balance ?? 0) + seatAmount,
            updated_at: nowIso,
          },
          { onConflict: 'user_id' }
        );

        await client.from('wallet_transactions').insert({
          user_id: listing.host_id,
          membership_id: row.id,
          type: 'escrow_release',
          amount: seatAmount,
          status: 'completed',
          description: `48h dispute window auto-release for ${listing.plan_type}`,
        });
      }
    } catch (err) {
      reportError('cron.auto_release_wallet', err, { membershipId: row.id });
    }
  }

  // 3. Auto-refund 24h overdue uninvited 'paid_and_held' memberships (PRD Section 7.4 / PAY-4)
  const { data: overdueUninvited } = await client
    .from('memberships')
    .select('id, listing_id, member_id, price_per_seat')
    .eq('status', 'paid_and_held')
    .lte('created_at', cutoff24h);

  let autoRefundedCount = 0;
  for (const row of overdueUninvited ?? []) {
    try {
      if (getPaystackSecret()) {
        const { data: payment } = await client
          .from('payments')
          .select('provider_reference, status')
          .eq('membership_id', row.id)
          .eq('status', 'held')
          .maybeSingle();

        if (payment?.provider_reference) {
          await refundPaystackPayment(
            payment.provider_reference,
            'Automatic refund: Host did not send the official invitation within 24 hours.'
          );
          await client
            .from('payments')
            .update({ status: 'refunded', updated_at: nowIso })
            .eq('provider_reference', payment.provider_reference);
        }
      }

      await client
        .from('memberships')
        .update({ status: 'refunded', left_at: nowIso, updated_at: nowIso })
        .eq('id', row.id);

      const seatAmount = Number(row.price_per_seat ?? 0);
      const { data: listing } = await client
        .from('listings')
        .select('host_id, plan_type')
        .eq('id', row.listing_id)
        .maybeSingle();

      if (listing?.host_id && seatAmount > 0) {
        const { data: wallet } = await client
          .from('wallets')
          .select('held_balance, available_balance')
          .eq('user_id', listing.host_id)
          .maybeSingle();

        await client.from('wallets').upsert(
          {
            user_id: listing.host_id,
            held_balance: Math.max(0, Number(wallet?.held_balance ?? 0) - seatAmount),
            available_balance: Number(wallet?.available_balance ?? 0),
            updated_at: nowIso,
          },
          { onConflict: 'user_id' }
        );
      }

      await createInAppNotification({
        userId: row.member_id,
        type: 'auto_refund',
        title: `Automatic refund issued for ${listing?.plan_type || 'your split'}`,
        body: 'The host did not mark your official invitation as sent within 24 hours, so your payment has been refunded.',
        link: '/dashboard',
      });

      autoRefundedCount += 1;
    } catch (err) {
      reportError('cron.auto_refund_24h', err, { membershipId: row.id });
    }
  }

  trackEvent('cron.reconcile', {
    expiredHoldsReleased: (expiredHolds ?? []).length,
    autoConfirmedAfter48h: (autoConfirmed ?? []).length,
    autoRefundedAfter24h: autoRefundedCount,
  });

  return NextResponse.json({
    reconciledAt: nowIso,
    expiredHoldsReleased: (expiredHolds ?? []).length,
    autoConfirmedAfter48h: (autoConfirmed ?? []).length,
    overdueHostInvites24h: (overdueUninvited ?? []).length,
    autoRefundedAfter24h: autoRefundedCount,
  });
}

