import { NextResponse } from 'next/server';
import {
  readDb,
  writeDb,
  getAuthenticatedUser,
  createSession,
  toPublicUser,
} from '@/lib/server/db';

export async function GET() {
  const user = getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error: 'Sign in to view your profile.' }, { status: 401 });
  }

  return NextResponse.json({
    user: toPublicUser(user),
    profile: {
      display_name: user.name,
      avatar_url: user.avatar,
      bio: null,
      rating_avg: 5.0,
      completed_splits: user.successfulSplits,
    },
    phone: user.phone ?? null,
    metadata: {
      country: user.country ?? 'United States',
      countryFlag: user.countryFlag ?? '🇺🇸',
      verificationMethod: user.verificationMethod ?? null,
      verificationDetail: user.verificationDetail ?? null,
      isVetted: Boolean(user.isVetted),
    },
  });
}

export async function PATCH(request: Request) {
  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Send valid JSON.' }, { status: 400 });
  }

  const allowedFields = [
    'display_name',
    'avatar_url',
    'bio',
    'phone',
    'country',
    'country_flag',
    'verification_method',
    'verification_detail',
    'is_vetted',
  ];

  if (
    Object.keys(body).length === 0 ||
    Object.keys(body).some((key) => !allowedFields.includes(key))
  ) {
    return NextResponse.json(
      { error: 'Send one or more supported profile fields.' },
      { status: 400 }
    );
  }

  const authUser = getAuthenticatedUser();
  if (!authUser) {
    return NextResponse.json({ error: 'Sign in to update your profile.' }, { status: 401 });
  }

  const db = readDb();
  const userIdx = db.users.findIndex((u) => u.id === authUser.id);
  if (userIdx === -1) {
    return NextResponse.json({ error: 'User profile not found.' }, { status: 404 });
  }

  const user = db.users[userIdx];

  if (typeof body.display_name === 'string' && body.display_name.trim()) {
    user.name = body.display_name.trim();
  }
  if (typeof body.avatar_url === 'string' && body.avatar_url.trim()) {
    user.avatar = body.avatar_url.trim();
  }
  if (typeof body.phone === 'string') {
    user.phone = body.phone.trim() || undefined;
  }
  if (typeof body.country === 'string' && body.country.trim()) {
    user.country = body.country.trim();
  }
  if (typeof body.country_flag === 'string' && body.country_flag.trim()) {
    user.countryFlag = body.country_flag.trim();
  }
  if (
    typeof body.verification_method === 'string' &&
    ['linkedin', 'email', 'declaration'].includes(body.verification_method)
  ) {
    user.verificationMethod = body.verification_method as 'linkedin' | 'email' | 'declaration';
  }
  if (typeof body.verification_detail === 'string') {
    user.verificationDetail = body.verification_detail.trim() || undefined;
  }
  if (typeof body.is_vetted === 'boolean') {
    user.isVetted = body.is_vetted;
  }

  // Keep host metadata in sync on listings created by this user
  db.listings = db.listings.map((l) => {
    if (l.hostId === user.id) {
      return {
        ...l,
        hostName: user.name,
        hostAvatar: user.avatar,
        country: user.country,
        countryFlag: user.countryFlag,
      };
    }
    return l;
  });

  db.users[userIdx] = user;
  writeDb(db);
  createSession(user.id);

  return NextResponse.json({
    message: 'Profile updated.',
    user: toPublicUser(user),
    onboarding: {
      country: user.country,
      countryFlag: user.countryFlag,
      verificationMethod: user.verificationMethod,
      verificationDetail: user.verificationDetail,
      isVetted: user.isVetted,
    },
  });
}
