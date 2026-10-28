import { NextResponse } from 'next/server';
import crypto from 'crypto';
import {
  readDb,
  writeDb,
  getAuthenticatedUser,
  StoredJoinRequest,
  StoredNotification,
} from '@/lib/server/db';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authUser = getAuthenticatedUser();
  if (!authUser) {
    return NextResponse.json(
      { error: 'Please sign in before joining a listing.' },
      { status: 401 }
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // Optional body
  }

  const db = readDb();
  const listingIdx = db.listings.findIndex((l) => l.id === params.id);

  if (listingIdx === -1) {
    return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });
  }

  const listing = db.listings[listingIdx];

  if (listing.hostId === authUser.id) {
    return NextResponse.json(
      { error: 'You are the host of this listing.' },
      { status: 400 }
    );
  }

  const alreadyJoined = db.joinRequests.find(
    (r) =>
      r.listingId === listing.id &&
      r.userId === authUser.id &&
      r.status !== 'rejected'
  );

  if (alreadyJoined) {
    return NextResponse.json(
      { error: 'You have already joined this split.' },
      { status: 409 }
    );
  }

  if (listing.slotsFilled >= listing.slotsTotal) {
    return NextResponse.json(
      { error: 'No seats are currently available in this split.' },
      { status: 400 }
    );
  }

  listing.slotsFilled += 1;
  db.listings[listingIdx] = listing;

  const userName =
    typeof body.userName === 'string' && body.userName.trim()
      ? body.userName.trim()
      : authUser.name;
  const userEmail =
    typeof body.userEmail === 'string' && body.userEmail.trim()
      ? body.userEmail.trim()
      : authUser.email;
  const userPhone =
    typeof body.userPhone === 'string' && body.userPhone.trim()
      ? body.userPhone.trim()
      : authUser.phone || userEmail;

  const now = new Date().toISOString();

  const newRequest: StoredJoinRequest = {
    id: crypto.randomUUID(),
    listingId: listing.id,
    userId: authUser.id,
    userName,
    userEmail,
    userPhone,
    userContact: userPhone || userEmail,
    status: 'approved',
    createdAt: now,
  };

  db.joinRequests.unshift(newRequest);

  const joinerNotif: StoredNotification = {
    id: crypto.randomUUID(),
    userId: authUser.id,
    listingId: listing.id,
    planName: listing.planName,
    hostName: listing.hostName,
    contactMethod: listing.contactMethod,
    contactValue: listing.contactValue,
    read: false,
    createdAt: now,
  };

  db.notifications.unshift(joinerNotif);

  const userIdx = db.users.findIndex((u) => u.id === authUser.id);
  if (userIdx !== -1) {
    db.users[userIdx].successfulSplits = (db.users[userIdx].successfulSplits || 0) + 1;
  }

  writeDb(db);

  return NextResponse.json(
    {
      data: {
        listing,
        joinRequest: newRequest,
        notification: joinerNotif,
      },
    },
    { status: 201 }
  );
}

