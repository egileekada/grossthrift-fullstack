import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/server/db';

export async function PATCH() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  return NextResponse.json(
    { error: 'Notifications are not yet backed by a Supabase table.' },
    { status: 501 },
  );
}
