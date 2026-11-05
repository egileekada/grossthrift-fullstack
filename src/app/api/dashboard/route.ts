import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/server/db';
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

  try {
    // 1. Fetch hosted listings
    const { data: hostedListings } = await client
      .from('listings')
      .select('id, host_id, plan_type, total_cost, billing_cycle, seats_total, seats_open, price_per_seat, status, visibility')
      .eq('host_id', authUser.id);

    const hostedIds = (hostedListings ?? []).map((l) => l.id);

    // 2. Fetch memberships where user is member OR listing is hosted by user
    const [memberRowsRes, hostMemberRowsRes] = await Promise.all([
      client
        .from('memberships')
        .select('*')
        .eq('member_id', authUser.id)
        .order('created_at', { ascending: false }),
      hostedIds.length > 0
        ? client
            .from('memberships')
            .select('*')
            .in('listing_id', hostedIds)
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ]);

    const rawMemberships = [
      ...(memberRowsRes.data ?? []),
      ...(hostMemberRowsRes.data ?? []),
    ];
    const uniqueMembershipsMap = new Map<string, Record<string, unknown>>();
    for (const m of rawMemberships) {
      uniqueMembershipsMap.set(String(m.id), m);
    }
    const allMemberships = Array.from(uniqueMembershipsMap.values());

    // Collect listing IDs & user IDs to enrich
    const listingIds = Array.from(
      new Set(allMemberships.map((m) => String(m.listing_id)))
    );
    const [listingsWithHostRes, paymentsRes] = await Promise.all([
      listingIds.length > 0
        ? client
            .from('listings_with_host')
            .select('id, plan_type, service_name, service_category, billing_cycle, price_per_seat, host_display_name')
            .in('id', listingIds)
        : Promise.resolve({ data: [] }),
      allMemberships.length > 0
        ? client
            .from('payments')
            .select('id, membership_id, provider_reference, authorization_url, status, seat_amount_minor, amount_minor')
            .in(
              'membership_id',
              allMemberships.map((m) => String(m.id))
            )
        : Promise.resolve({ data: [] }),
    ]);

    const listingInfoById = new Map(
      (listingsWithHostRes.data ?? []).map((l) => [String(l.id), l])
    );
    const hostedById = new Map(
      (hostedListings ?? []).map((l) => [String(l.id), l])
    );
    const paymentByMembershipId = new Map(
      (paymentsRes.data ?? []).map((p) => [String(p.membership_id), p])
    );

    // Fetch member profile names & emails
    const memberUserIds = Array.from(
      new Set(allMemberships.map((m) => String(m.member_id)))
    );
    const { data: memberProfiles } = memberUserIds.length
      ? await client
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', memberUserIds)
      : { data: [] };
    const profileById = new Map(
      (memberProfiles ?? []).map((p) => [String(p.id), p])
    );

    const emailByUserId = new Map<string, string>();
    emailByUserId.set(authUser.id, authUser.email);
    if (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const admin = createAdminClient();
      await Promise.all(
        memberUserIds.slice(0, 25).map(async (uid) => {
          if (emailByUserId.has(uid)) return;
          try {
            const { data } = await admin.auth.admin.getUserById(uid);
            if (data?.user?.email) {
              emailByUserId.set(uid, data.user.email);
            }
          } catch {
            // ignore
          }
        })
      );
    }

    const enrichedMemberships = allMemberships.map((m) => {
      const listingId = String(m.listing_id);
      const lInfo = listingInfoById.get(listingId);
      const hInfo = hostedById.get(listingId);
      const payment = paymentByMembershipId.get(String(m.id));
      const memberId = String(m.member_id);
      const memberProfile = profileById.get(memberId);
      const memberEmail = emailByUserId.get(memberId) || 'Verified member';
      const memberName =
        memberProfile?.display_name ||
        (memberEmail.includes('@') ? memberEmail.split('@')[0] : 'Member');

      return {
        id: String(m.id),
        listingId,
        memberId,
        hostId: hInfo?.host_id || (memberId === authUser.id ? '' : authUser.id),
        isHost: Boolean(hInfo),
        planName: lInfo?.plan_type || hInfo?.plan_type || lInfo?.service_name || 'Subscription Split',
        category: lInfo?.service_category || 'Streaming',
        billingCycle: lInfo?.billing_cycle || hInfo?.billing_cycle || 'monthly',
        pricePerSeat: Number(m.price_per_seat ?? lInfo?.price_per_seat ?? 0),
        status: String(m.status),
        seatExpiresAt: m.seat_expires_at ? String(m.seat_expires_at) : null,
        invitationSentAt: m.invitation_sent_at ? String(m.invitation_sent_at) : null,
        accessConfirmedAt: m.access_confirmed_at ? String(m.access_confirmed_at) : null,
        createdAt: String(m.created_at || m.joined_at || new Date().toISOString()),
        memberName,
        memberEmail,
        memberAvatar: memberProfile?.avatar_url || null,
        hostName: lInfo?.host_display_name || authUser.name,
        authorizationUrl: payment?.authorization_url || null,
        paymentStatus: payment?.status || null,
        paymentReference: payment?.provider_reference || null,
      };
    });

    // 3. Fetch host invites
    const { data: invitesData } = hostedIds.length
      ? await client
          .from('invites')
          .select('id, listing_id, status, expires_at, max_uses, use_count, created_at, revoked_at')
          .in('listing_id', hostedIds)
          .order('created_at', { ascending: false })
      : { data: [] };

    // 4. Compute / fetch wallet & payout requests (gracefully handling optional tables)
    let walletRow: Record<string, unknown> | null = null;
    let walletTransactions: Array<Record<string, unknown>> = [];
    let payoutRequests: Array<Record<string, unknown>> = [];
    let disputes: Array<Record<string, unknown>> = [];
    let ratings: Array<Record<string, unknown>> = [];

    try {
      const { data: w } = await client
        .from('wallets')
        .select('*')
        .eq('user_id', authUser.id)
        .maybeSingle();
      walletRow = w;
    } catch {
      walletRow = null;
    }

    try {
      const { data: wt } = await client
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false })
        .limit(30);
      walletTransactions = wt ?? [];
    } catch {
      walletTransactions = [];
    }

    try {
      const { data: pr } = await client
        .from('payout_requests')
        .select('*')
        .eq('host_id', authUser.id)
        .order('created_at', { ascending: false });
      payoutRequests = pr ?? [];
    } catch {
      payoutRequests = [];
    }

    try {
      const { data: disp } = await client
        .from('disputes')
        .select('*')
        .order('created_at', { ascending: false });
      disputes = (disp ?? []).filter(
        (d) =>
          d.opened_by === authUser.id ||
          hostedIds.includes(String(d.listing_id))
      );
    } catch {
      disputes = [];
    }

    try {
      const { data: rat } = await client
        .from('ratings')
        .select('id, membership_id, rater_id, ratee_id, stars, comment, created_at')
        .eq('rater_id', authUser.id);
      ratings = rat ?? [];
    } catch {
      ratings = [];
    }

    // Calculate held & available balances from real memberships if wallet row is 0/uninitialized
    const computedHeld = enrichedMemberships
      .filter((m) => m.isHost && (m.status === 'paid_and_held' || m.status === 'invited' || m.status === 'disputed'))
      .reduce((sum, m) => sum + m.pricePerSeat, 0);

    const computedReleased = enrichedMemberships
      .filter((m) => m.isHost && m.status === 'active')
      .reduce((sum, m) => sum + m.pricePerSeat, 0);

    const totalWithdrawn = payoutRequests
      .filter((p) => p.status !== 'failed')
      .reduce((sum, p) => sum + Number(p.amount ?? 0), 0);

    const heldBalance =
      walletRow && Number(walletRow.held_balance) > 0
        ? Number(walletRow.held_balance)
        : computedHeld;
    const availableBalance =
      walletRow && Number(walletRow.available_balance) > 0
        ? Number(walletRow.available_balance)
        : Math.max(0, computedReleased - totalWithdrawn);

    const metadata = authUser as unknown as Record<string, unknown>;

    return NextResponse.json(
      {
        memberships: enrichedMemberships,
        invites: invitesData ?? [],
        wallet: {
          availableBalance,
          heldBalance,
          currency: 'NGN',
          bankName: (walletRow?.bank_name as string) || (metadata.bank_name as string) || '',
          accountNumber: (walletRow?.account_number as string) || (metadata.account_number as string) || '',
          accountName: (walletRow?.account_name as string) || (metadata.account_name as string) || '',
          transactions: walletTransactions,
          payoutRequests,
        },
        disputes,
        ratings,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('GET /api/dashboard error:', error);
    return NextResponse.json({ error: 'Could not load dashboard details.' }, { status: 500 });
  }
}

