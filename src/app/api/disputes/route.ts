import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/server/db';
import { createAdminClient } from '@/lib/server/supabaseAdmin';
import { createClient } from '@/lib/supabase/server';
import { createInAppNotification } from '@/lib/server/email';

const ALLOWED_REASONS = new Set([
  'no_invite',
  'invite_failed',
  'access_revoked',
  'wrong_plan',
  'other',
]);

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

  const membershipId = typeof body.membershipId === 'string' ? body.membershipId.trim() : '';
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';

  if (!membershipId || !ALLOWED_REASONS.has(reason) || description.length < 10) {
    return NextResponse.json(
      { error: 'Select a valid dispute reason and provide at least 10 characters describing the issue.' },
      { status: 400 }
    );
  }

  const client =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createAdminClient()
      : createClient();

  const { data: membership } = await client
    .from('memberships')
    .select('id, listing_id, member_id, status')
    .eq('id', membershipId)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: 'Membership not found.' }, { status: 404 });
  }

  const { data: listing } = await client
    .from('listings')
    .select('id, host_id, plan_type')
    .eq('id', membership.listing_id)
    .maybeSingle();

  const isInvolved =
    membership.member_id === authUser.id ||
    (listing && listing.host_id === authUser.id);
  if (!isInvolved) {
    return NextResponse.json({ error: 'Not authorized to open a dispute for this split.' }, { status: 403 });
  }

  // Freeze membership in 'disputed' status so funds are held pending resolution (PRD DSP-2)
  await client
    .from('memberships')
    .update({ status: 'disputed', updated_at: new Date().toISOString() })
    .eq('id', membership.id);

  let createdDispute: Record<string, unknown> | null = null;
  try {
    const { data } = await client
      .from('disputes')
      .insert({
        membership_id: membership.id,
        listing_id: membership.listing_id,
        opened_by: authUser.id,
        reason,
        description,
        status: 'open',
      })
      .select('*')
      .single();
    createdDispute = data;
  } catch {
    createdDispute = {
      id: membership.id,
      membership_id: membership.id,
      listing_id: membership.listing_id,
      reason,
      description,
      status: 'open',
    };
  }

  if (listing?.host_id) {
    await createInAppNotification({
      userId: listing.host_id === authUser.id ? membership.member_id : listing.host_id,
      type: 'dispute_opened',
      title: `Dispute opened for ${listing.plan_type}`,
      body: `Escrow funds are frozen while GrossThrift Trust & Safety reviews the report (${reason.replace('_', ' ')}).`,
      link: '/dashboard',
    });
  }

  return NextResponse.json(
    {
      message: 'Dispute opened. Escrow funds are frozen while Trust & Safety reviews your case.',
      data: createdDispute,
    },
    { status: 201 }
  );
}

