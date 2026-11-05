import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/server/db';

// Retained for older clients during migration. The payment flow creates
// memberships directly and does not support host approval requests.
export async function PATCH() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  return NextResponse.json(
    { error: 'Join requests are no longer used. Members reserve seats through checkout.' },
    { status: 409 },
  );
}

// Avoid deleting or changing paid membership records through this legacy URL.
export async function DELETE() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  return NextResponse.json(
    { error: 'This action is unavailable while membership history and refund handling are being reconciled.' },
    { status: 409 },
  );
}
