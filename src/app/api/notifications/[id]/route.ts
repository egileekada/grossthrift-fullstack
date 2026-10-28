import { NextResponse } from 'next/server';
import { readDb, writeDb, getAuthenticatedUser } from '@/lib/server/db';

export async function PATCH(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const authUser = getAuthenticatedUser();
  if (!authUser) {
    return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  }

  const db = readDb();
  const idx = db.notifications.findIndex(
    (n) => n.id === params.id && n.userId === authUser.id
  );

  if (idx === -1) {
    return NextResponse.json({ error: 'Notification not found.' }, { status: 404 });
  }

  db.notifications[idx].read = true;
  writeDb(db);

  return NextResponse.json({ data: db.notifications[idx] });
}

