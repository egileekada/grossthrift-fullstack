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

  const { data: listing } = await client
    .from('listings')
    .select('id, host_id, plan_type')
    .eq('id', membership.listing_id)
    .maybeSingle();

  if (!listing || listing.host_id !== authUser.id) {
    return NextResponse.json(
      { error: 'Only the host of this listing can mark the official invitation as sent.' },
      { status: 403 }
    );
  }

  if (membership.status !== 'paid_and_held' && membership.status !== 'invited') {
    return NextResponse.json(
      { error: `Cannot mark invited when membership status is "${membership.status}".` },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await client
    .from('memberships')
    .update({
      status: 'invited',
      invitation_sent_at: now,
      updated_at: now,
    })
    .eq('id', params.id)
    .select('*')
    .single();

  if (updateError || !updated) {
    return NextResponse.json({ error: 'Could not update membership status.' }, { status: 500 });
  }

  await createInAppNotification({
    userId: membership.member_id,
    type: 'host_invited',
    title: `${authUser.name} sent your official invite for ${listing.plan_type}`,
    body: 'Check your email or service account for the official invitation, then click "I Have Access" on your dashboard within 48 hours.',
    link: '/dashboard',
  });

  if (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const admin = createAdminClient();
      const { data: memberAuth } = await admin.auth.admin.getUserById(membership.member_id);
      if (memberAuth?.user?.email) {
        await sendTransactionalEmail({
          to: memberAuth.user.email,
          subject: `Action Required: Confirm your access to ${listing.plan_type}`,
          heading: `${authUser.name} has sent your official invitation!`,
          body: `Your host has sent the official provider invitation for ${listing.plan_type}. Please accept the invitation in your account and click "I Have Access" on your GrossThrift dashboard within 48 hours (or report a problem if the invite did not work).`,
          ctaLabel: 'Confirm Access on Dashboard',
          ctaUrl: `${getSiteUrl()}/dashboard?tab=joined`,
        });
      }
    } catch {
      // Non-blocking email notification
    }
  }

  return NextResponse.json({
    message: 'Official invitation marked as sent. Member has 48 hours to confirm access.',
    data: updated,
  });
}

