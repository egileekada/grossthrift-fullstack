import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/server/supabaseAdmin';
import { createClient } from '@/lib/supabase/server';

// PRD Section 11.4 Scheduled SLA Reconciliation:
// 1. Expire 10-minute 'pending_payment' seat holds and return seats_open.
// 2. Auto-confirm 'invited' memberships after 48 hours if no dispute was opened (ACC-4 / F-33).
// 3. Auto-refund 'paid_and_held' memberships if host did not invite within 24 hours (ACC-3 / F-34).
export async function GET() {
  const client =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createAdminClient()
      : createClient();

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

  // 2. Auto-confirm 'invited' memberships older than 48 hours
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

  // 3. Flag overdue 24h uninvited 'paid_and_held' memberships
  const { data: overdueUninvited } = await client
    .from('memberships')
    .select('id, listing_id, member_id')
    .eq('status', 'paid_and_held')
    .lte('created_at', cutoff24h);

  return NextResponse.json({
    reconciledAt: nowIso,
    expiredHoldsReleased: (expiredHolds ?? []).length,
    autoConfirmedAfter48h: (autoConfirmed ?? []).length,
    overdueHostInvites24h: (overdueUninvited ?? []).length,
  });
}

