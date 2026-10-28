import { NextResponse } from 'next/server';
import { readDb, writeDb, getAuthenticatedUser } from '@/lib/server/db';

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

  const status = body.status;
  if (status !== 'approved' && status !== 'rejected') {
    return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
  }

  const db = readDb();
  const reqIdx = db.joinRequests.findIndex((r) => r.id === params.id);
  if (reqIdx === -1) {
    return NextResponse.json({ error: 'Join request not found.' }, { status: 404 });
  }

  const joinReq = db.joinRequests[reqIdx];
  const listing = db.listings.find((l) => l.id === joinReq.listingId);

  if (!listing || listing.hostId !== authUser.id) {
    return NextResponse.json(
      { error: 'Only the host can update this join request.' },
      { status: 403 }
    );
  }

  const prevStatus = joinReq.status;
  joinReq.status = status;
  db.joinRequests[reqIdx] = joinReq;

  if (prevStatus !== 'rejected' && status === 'rejected') {
    listing.slotsFilled = Math.max(1, listing.slotsFilled - 1);
  } else if (prevStatus === 'rejected' && status === 'approved') {
    listing.slotsFilled = Math.min(listing.slotsTotal, listing.slotsFilled + 1);
  }

  writeDb(db);

  return NextResponse.json({ data: joinReq, listing });
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

  // Case 1: params.id is a joinRequest ID
  const reqIdx = db.joinRequests.findIndex((r) => r.id === params.id);
  if (reqIdx !== -1) {
    const joinReq = db.joinRequests[reqIdx];
    const listing = db.listings.find((l) => l.id === joinReq.listingId);

    if (
      joinReq.userId !== authUser.id &&
      (!listing || listing.hostId !== authUser.id)
    ) {
      return NextResponse.json({ error: 'Not authorized.' }, { status: 403 });
    }

    if (listing && joinReq.status !== 'rejected') {
      listing.slotsFilled = Math.max(1, listing.slotsFilled - 1);
    }

    db.joinRequests.splice(reqIdx, 1);
    writeDb(db);
    return NextResponse.json({ message: 'Membership removed.', listing });
  }

  // Case 2: params.id is a listing ID (host deleting listing or member leaving by listing ID)
  const listingIdx = db.listings.findIndex((l) => l.id === params.id);
  if (listingIdx !== -1) {
    const listing = db.listings[listingIdx];

    if (listing.hostId === authUser.id) {
      db.listings.splice(listingIdx, 1);
      db.joinRequests = db.joinRequests.filter((r) => r.listingId !== params.id);
      db.notifications = db.notifications.filter((n) => n.listingId !== params.id);
      writeDb(db);
      return NextResponse.json({ message: 'Listing deleted.', deletedListingId: params.id });
    }

    const memberReqIdx = db.joinRequests.findIndex(
      (r) => r.listingId === params.id && r.userId === authUser.id
    );
    if (memberReqIdx !== -1) {
      const memberReq = db.joinRequests[memberReqIdx];
      if (memberReq.status !== 'rejected') {
        listing.slotsFilled = Math.max(1, listing.slotsFilled - 1);
      }
      db.joinRequests.splice(memberReqIdx, 1);
      writeDb(db);
      return NextResponse.json({ message: 'Left split.', listing });
    }
  }

  return NextResponse.json({ error: 'Record not found.' }, { status: 404 });
}

