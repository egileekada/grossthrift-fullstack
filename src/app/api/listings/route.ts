import { NextResponse } from 'next/server';
import crypto from 'crypto';
import {
  readDb,
  writeDb,
  getAuthenticatedUser,
  normalizeCategory,
  normalizeCurrency,
} from '@/lib/server/db';
import { Listing } from '@/types/listing';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const page = Number(params.get('page') ?? '1');
  const pageSize = Number(params.get('pageSize') ?? '50');
  const category = params.get('category')?.trim();
  const search = params.get('search')?.trim();
  const sort = params.get('sort') ?? 'newest';
  const minPrice = params.has('minPrice') ? Number(params.get('minPrice')) : undefined;
  const maxPrice = params.has('maxPrice') ? Number(params.get('maxPrice')) : undefined;

  if (
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > 100
  ) {
    return NextResponse.json(
      { error: 'Invalid listing pagination values.' },
      { status: 400 }
    );
  }

  const db = readDb();
  const authUser = getAuthenticatedUser();

  let filtered = [...db.listings];

  if (category && category !== 'All') {
    filtered = filtered.filter((l) => l.category.toLowerCase() === category.toLowerCase());
  }

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (l) =>
        l.planName.toLowerCase().includes(q) ||
        l.category.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q) ||
        l.hostName.toLowerCase().includes(q)
    );
  }

  if (minPrice !== undefined && Number.isFinite(minPrice)) {
    filtered = filtered.filter((l) => l.totalCost / l.slotsTotal >= minPrice);
  }

  if (maxPrice !== undefined && Number.isFinite(maxPrice)) {
    filtered = filtered.filter((l) => l.totalCost / l.slotsTotal <= maxPrice);
  }

  if (sort === 'price_asc') {
    filtered.sort((a, b) => a.totalCost / a.slotsTotal - b.totalCost / b.slotsTotal);
  } else if (sort === 'price_desc') {
    filtered.sort((a, b) => b.totalCost / b.slotsTotal - a.totalCost / a.slotsTotal);
  } else {
    filtered.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  const total = filtered.length;
  const from = (page - 1) * pageSize;
  const paginated = filtered.slice(from, from + pageSize);

  // Include current user's joinedListingIds, joinRequests, and notifications if signed in
  const hostedListingIds = authUser
    ? db.listings.filter((l) => l.hostId === authUser.id).map((l) => l.id)
    : [];

  const userJoinRequests = authUser
    ? db.joinRequests.filter(
        (r) => r.userId === authUser.id || hostedListingIds.includes(r.listingId)
      )
    : [];

  const joinedListingIds = authUser
    ? Array.from(
        new Set([
          ...hostedListingIds,
          ...db.joinRequests
            .filter((r) => r.userId === authUser.id && r.status !== 'rejected')
            .map((r) => r.listingId),
        ])
      )
    : [];

  const userNotifications = authUser
    ? db.notifications.filter((n) => n.userId === authUser.id)
    : [];

  return NextResponse.json({
    data: paginated,
    joinedListingIds,
    joinRequests: userJoinRequests,
    notifications: userNotifications,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}

export async function POST(request: Request) {
  const authUser = getAuthenticatedUser();

  if (!authUser) {
    return NextResponse.json(
      { error: 'Please sign in before creating a listing.' },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const planName =
    typeof input.planName === 'string' && input.planName.trim()
      ? input.planName.trim()
      : typeof input.plan_type === 'string' && input.plan_type.trim()
        ? input.plan_type.trim()
        : '';

  const totalCost = Number(input.totalCost ?? input.total_cost ?? 0);
  const slotsTotal = Number(input.slotsTotal ?? input.seats_total ?? 0);
  const category = normalizeCategory(
    typeof input.category === 'string' ? input.category : undefined
  );
  const currency = normalizeCurrency(
    typeof input.currency === 'string' ? input.currency : undefined
  );
  const description =
    typeof input.description === 'string' && input.description.trim()
      ? input.description.trim()
      : `Shared co-buying group for ${planName} hosted by ${authUser.name}.`;
  const contactMethod =
    input.contactMethod === 'Email' ? 'Email' : 'WhatsApp';
  const contactValue =
    typeof input.contactValue === 'string' && input.contactValue.trim()
      ? input.contactValue.trim()
      : authUser.phone || authUser.email;
  const logoEmoji =
    typeof input.logoEmoji === 'string' ? input.logoEmoji : undefined;
  const rules =
    typeof input.rules === 'string' && input.rules.trim()
      ? input.rules.trim()
      : 'Respect your assigned profile slot and keep monthly renewals on time.';
  const billingCycle =
    typeof input.billingCycle === 'string'
      ? input.billingCycle
      : typeof input.billing_cycle === 'string'
        ? input.billing_cycle
        : 'monthly';
  const serviceId =
    typeof input.serviceId === 'string'
      ? input.serviceId
      : typeof input.service_id === 'string'
        ? input.service_id
        : undefined;

  if (!planName) {
    return NextResponse.json(
      { error: 'Please provide a subscription plan name.' },
      { status: 400 }
    );
  }

  if (!Number.isFinite(totalCost) || totalCost <= 0) {
    return NextResponse.json(
      { error: 'Total cost must be greater than 0.' },
      { status: 400 }
    );
  }

  if (!Number.isInteger(slotsTotal) || slotsTotal < 2 || slotsTotal > 20) {
    return NextResponse.json(
      { error: 'Number of people splitting must be between 2 and 20.' },
      { status: 400 }
    );
  }

  const db = readDb();
  const now = new Date().toISOString();

  const newListing: Listing = {
    id: crypto.randomUUID(),
    planName,
    category,
    totalCost,
    slotsTotal,
    slotsFilled: 1,
    currency,
    description,
    contactMethod,
    contactValue,
    logoEmoji,
    hostId: authUser.id,
    hostName: authUser.name,
    hostAvatar: authUser.avatar,
    hostVerified: Boolean(authUser.isVerified),
    hostJoined: authUser.memberSince || 'Oct 2026',
    hostSuccessfulSplits: (authUser.successfulSplits || 0) + 1,
    createdAt: now,
    country: authUser.country || 'United States',
    countryFlag: authUser.countryFlag || '🇺🇸',
    rules,
    billingCycle,
    serviceId,
  };

  db.listings.unshift(newListing);

  const userIdx = db.users.findIndex((u) => u.id === authUser.id);
  if (userIdx !== -1) {
    db.users[userIdx].successfulSplits = (db.users[userIdx].successfulSplits || 0) + 1;
  }

  writeDb(db);

  return NextResponse.json({ data: newListing }, { status: 201 });
}