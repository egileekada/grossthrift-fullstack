import { NextResponse } from 'next/server';
import crypto from 'crypto';
import {
  readDb,
  writeDb,
  hashPassword,
  createSession,
  toPublicUser,
  StoredUser,
  isSupabaseConfigured,
} from '@/lib/server/db';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Send valid JSON.' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const password = typeof input.password === 'string' ? input.password : '';
  const rawName = typeof input.name === 'string' ? input.name.trim() : '';
  const phone = typeof input.phone === 'string' && input.phone.trim() ? input.phone.trim() : undefined;
  const country = typeof input.country === 'string' && input.country.trim() ? input.country.trim() : 'United States';
  const countryFlag = typeof input.countryFlag === 'string' && input.countryFlag.trim() ? input.countryFlag.trim() : '🇺🇸';
  const verificationMethod =
    typeof input.verificationMethod === 'string' &&
    ['linkedin', 'email', 'declaration'].includes(input.verificationMethod)
      ? (input.verificationMethod as 'linkedin' | 'email' | 'declaration')
      : undefined;
  const verificationDetail =
    typeof input.verificationDetail === 'string' && input.verificationDetail.trim()
      ? input.verificationDetail.trim()
      : undefined;
  const isVetted = typeof input.isVetted === 'boolean' ? input.isVetted : Boolean(verificationMethod);

  if (!email || !email.includes('@') || email.length > 254) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }

  if (!rawName || rawName.length < 2) {
    return NextResponse.json({ error: 'Please enter your full name (at least 2 characters).' }, { status: 400 });
  }

  if (password.length < 8 || password.length > 128) {
    return NextResponse.json(
      { error: 'Password must be between 8 and 128 characters.' },
      { status: 400 }
    );
  }

  const db = readDb();
  const existingUser = db.users.find((u) => u.email.toLowerCase() === email);
  if (existingUser) {
    return NextResponse.json(
      { error: 'An account with this email already exists. Please sign in instead.' },
      { status: 409 }
    );
  }

  const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(rawName)}`;
  let userId: string = crypto.randomUUID();

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: new URL('/auth/callback', request.url).toString(),
          data: {
            display_name: rawName,
            name: rawName,
            avatar_url: avatarUrl,
            phone: phone || null,
            country,
            country_flag: countryFlag,
            verification_method: verificationMethod || null,
            verification_detail: verificationDetail || null,
            is_vetted: isVetted,
          },
        },
      });
      if (!error && data.user?.id) {
        userId = data.user.id;
      }
    } catch (err) {
      console.warn('Supabase signup sync skipped:', err);
    }
  }

  const now = new Date();
  const newUser: StoredUser = {
    id: userId,
    name: rawName,
    email,
    phone,
    avatar: avatarUrl,
    isVerified: true,
    memberSince: now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    successfulSplits: 0,
    country,
    countryFlag,
    verificationMethod,
    verificationDetail,
    isVetted,
    passwordHash: hashPassword(password),
    createdAt: now.toISOString(),
  };

  db.users.push(newUser);
  writeDb(db);

  createSession(newUser.id);

  return NextResponse.json(
    {
      message: 'Account created successfully!',
      user: toPublicUser(newUser),
    },
    { status: 201 }
  );
}
