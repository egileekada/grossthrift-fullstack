import { NextResponse } from 'next/server';
import {
  ensureServiceCatalog,
  ensureUserProfile,
  getAuthenticatedUser,
} from '@/lib/server/db';
import { createAdminClient } from '@/lib/server/supabaseAdmin';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const authUser = await getAuthenticatedUser();
  if (!authUser) {
    return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  }

  const client =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createAdminClient()
      : createClient();

  const [listingsRes, membershipsRes, paymentsRes] = await Promise.all([
    client.from('listings').select('id, host_type, plan_type, total_cost, seats_total, seats_open, status, visibility, created_at').order('created_at', { ascending: false }).limit(50),
    client.from('memberships').select('id, listing_id, member_id, status, price_per_seat, created_at').order('created_at', { ascending: false }).limit(50),
    client.from('payments').select('id, provider_reference, amount_minor, fee_amount_minor, status, created_at').order('created_at', { ascending: false }).limit(50),
  ]);

  let disputes: Array<Record<string, unknown>> = [];
  let payouts: Array<Record<string, unknown>> = [];
  try {
    const { data: d } = await client.from('disputes').select('*').order('created_at', { ascending: false });
    disputes = d ?? [];
  } catch {
    disputes = [];
  }

  try {
    const { data: p } = await client.from('payout_requests').select('*').order('created_at', { ascending: false });
    payouts = p ?? [];
  } catch {
    payouts = [];
  }

  return NextResponse.json({
    listings: listingsRes.data ?? [],
    memberships: membershipsRes.data ?? [],
    payments: paymentsRes.data ?? [],
    disputes,
    payouts,
  });
}

export async function POST(request: Request) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) {
    return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const client =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createAdminClient()
      : createClient();

  const action = typeof body.action === 'string' ? body.action : '';

  // 1. Create Official GrossThrift-hosted listing (PRD ADM-1 / F-57)
  if (action === 'create_official_listing') {
    await ensureUserProfile(authUser);
    const services = await ensureServiceCatalog();
    const planName = typeof body.planName === 'string' ? body.planName.trim() : 'Netflix Premium 4K';
    const totalCost = Number(body.totalCost ?? 8500);
    const seatsTotal = Number(body.seatsTotal ?? 4);
    const service =
      services.find((s) => planName.toLowerCase().includes(s.name.toLowerCase())) ||
      services[0];

    if (!service) {
      return NextResponse.json({ error: 'No active service in catalog.' }, { status: 400 });
    }

    const { data: created, error } = await client
      .from('listings')
      .insert({
        host_type: 'official',
        host_id: authUser.id,
        service_id: service.id,
        plan_type: planName,
        total_cost: totalCost,
        billing_cycle: body.billingCycle === 'yearly' ? 'yearly' : 'monthly',
        seats_total: seatsTotal,
        seats_open: seatsTotal - 1,
        price_per_seat: Number((totalCost / seatsTotal).toFixed(2)),
        currency: 'NGN',
        description:
          (typeof body.description === 'string' && body.description.trim()) ||
          `Official GrossThrift managed split for ${planName}.`,
        rules: 'Official GrossThrift pool. Accept your official invitation promptly.',
        status: 'active',
        visibility: 'public',
        host_attested: true,
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ message: 'Official listing published!', data: created }, { status: 201 });
  }

  // 2. Resolve Dispute (Refund Member or Release to Host — PRD F-61)
  if (action === 'resolve_dispute') {
    const disputeId = typeof body.disputeId === 'string' ? body.disputeId : '';
    const membershipId = typeof body.membershipId === 'string' ? body.membershipId : '';
    const decision = body.decision === 'refund' ? 'resolved_refund' : 'resolved_release';
    const note = typeof body.note === 'string' ? body.note.trim() : 'Resolved by Trust & Safety.';
    const now = new Date().toISOString();

    if (disputeId) {
      try {
        await client
          .from('disputes')
          .update({
            status: decision,
            resolution_note: note,
            resolved_by: authUser.id,
            resolved_at: now,
          })
          .eq('id', disputeId);
      } catch {
        // ignore
      }
    }

    if (membershipId) {
      await client
        .from('memberships')
        .update({
          status: decision === 'resolved_refund' ? 'refunded' : 'active',
          access_confirmed_at: decision === 'resolved_release' ? now : null,
          updated_at: now,
        })
        .eq('id', membershipId);
    }

    return NextResponse.json({
      message:
        decision === 'resolved_refund'
          ? 'Dispute resolved in favor of member (Refunded).'
          : 'Dispute resolved in favor of host (Funds released).',
    });
  }

  // 3. Process Host Payout Request (PRD F-62)
  if (action === 'mark_payout_paid') {
    const payoutId = typeof body.payoutId === 'string' ? body.payoutId : '';
    if (!payoutId) {
      return NextResponse.json({ error: 'Missing payoutId.' }, { status: 400 });
    }
    await client
      .from('payout_requests')
      .update({
        status: 'paid',
        processed_at: new Date().toISOString(),
      })
      .eq('id', payoutId);

    return NextResponse.json({ message: 'Payout marked as paid.' });
  }

  return NextResponse.json({ error: 'Unsupported admin action.' }, { status: 400 });
}

