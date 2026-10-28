import { NextResponse } from 'next/server';
import { readDb, writeDb, getAuthenticatedUser } from '@/lib/server/db';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const db = readDb();
  const listing = db.listings.find((l) => l.id === params.id);

  if (!listing) {
    return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
  }

  return NextResponse.json({ data: listing });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authUser = getAuthenticatedUser();
  if (!authUser) {
    return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const db = readDb();
  const idx = db.listings.findIndex(
    (l) => l.id === params.id && l.hostId === authUser.id
  );

  if (idx === -1) {
    return NextResponse.json(
      { error: 'Listing not found or you are not its host.' },
      { status: 404 }
    );
  }

  const listing = db.listings[idx];

  if (typeof body.description === 'string') {
    listing.description = body.description.trim();
  }
  if (typeof body.rules === 'string' && body.rules.trim()) {
    listing.rules = body.rules.trim();
  }
  if (typeof body.totalCost === 'number' && body.totalCost > 0) {
    listing.totalCost = body.totalCost;
  }

  db.listings[idx] = listing;
  writeDb(db);

  return NextResponse.json({ data: listing });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const authUser = getAuthenticatedUser();
  if (!authUser) {
    return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  }

  const db = readDb();
  const listing = db.listings.find((l) => l.id === params.id);

  if (!listing) {
    return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
  }

  if (listing.hostId !== authUser.id) {
    return NextResponse.json(
      { error: 'Only the host can delete this listing.' },
      { status: 403 }
    );
  }

  db.listings = db.listings.filter((l) => l.id !== params.id);
  db.joinRequests = db.joinRequests.filter((r) => r.listingId !== params.id);
  db.notifications = db.notifications.filter((n) => n.listingId !== params.id);
  writeDb(db);

  return NextResponse.json({ message: 'Listing deleted.' });
}
