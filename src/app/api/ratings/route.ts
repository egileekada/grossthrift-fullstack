import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/server/db';
import { createAdminClient } from '@/lib/server/supabaseAdmin';
import { createClient } from '@/lib/supabase/server';

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
  const stars = Number(body.stars ?? 0);
  const comment = typeof body.comment === 'string' ? body.comment.trim().slice(0, 300) : '';

  if (!membershipId || !Number.isInteger(stars) || stars < 1 || stars > 5) {
    return NextResponse.json(
      { error: 'Choose a star rating between 1 and 5.' },
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

  if (!membership || membership.status !== 'active') {
    return NextResponse.json(
      { error: 'Ratings can only be submitted for active confirmed splits.' },
      { status: 409 }
    );
  }

  const { data: listing } = await client
    .from('listings')
    .select('id, host_id')
    .eq('id', membership.listing_id)
    .maybeSingle();

  if (!listing) {
    return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
  }

  const rateeId =
    authUser.id === membership.member_id ? listing.host_id : membership.member_id;

  if (!rateeId || rateeId === authUser.id) {
    return NextResponse.json({ error: 'Cannot rate yourself.' }, { status: 400 });
  }

  try {
    await client.from('ratings').upsert(
      {
        membership_id: membership.id,
        rater_id: authUser.id,
        ratee_id: rateeId,
        stars,
        comment: comment || null,
      },
      { onConflict: 'membership_id,rater_id' }
    );

    const { data: allRatings } = await client
      .from('ratings')
      .select('stars')
      .eq('ratee_id', rateeId);

    if (allRatings && allRatings.length > 0) {
      const avg =
        allRatings.reduce((sum, r) => sum + Number(r.stars), 0) / allRatings.length;
      await client
        .from('profiles')
        .update({ rating_avg: Number(avg.toFixed(2)) })
        .eq('id', rateeId);
    }
  } catch {
    // Fallback if ratings table migration hasn't run yet: still update profile rating_avg
    await client
      .from('profiles')
      .update({ rating_avg: stars })
      .eq('id', rateeId);
  }

  return NextResponse.json(
    { message: `Thank you! Your ${stars}-star rating has been recorded.` },
    { status: 201 }
  );
}

