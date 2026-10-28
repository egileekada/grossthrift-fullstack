import { NextResponse } from 'next/server';
import crypto from 'crypto';
import {
  readDb,
  writeDb,
  verifyPassword,
  hashPassword,
  createSession,
  toPublicUser,
  StoredUser,
  saveOtpChallenge,
  verifyOtpChallenge,
  isSupabaseConfigured,
} from '@/lib/server/db';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
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
    const provider = typeof input.provider === 'string' ? input.provider : 'email';
    const db = readDb();

    // 1. Google Sign-In flow (requires real email & name, never dummy data)
    if (provider === 'google') {
      const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
      const name = typeof input.name === 'string' ? input.name.trim() : '';

      if (!email || !email.includes('@') || !name) {
        return NextResponse.json(
          { error: 'Please provide your email and name to continue with Google.' },
          { status: 400 }
        );
      }

      let user = db.users.find((u) => u.email.toLowerCase() === email);
      if (!user) {
        const now = new Date();
        user = {
          id: crypto.randomUUID(),
          name,
          email,
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
          isVerified: true,
          memberSince: now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          successfulSplits: 0,
          country: 'United States',
          countryFlag: '🇺🇸',
          isVetted: false,
          passwordHash: hashPassword(crypto.randomBytes(16).toString('hex')),
          createdAt: now.toISOString(),
        };
        db.users.push(user);
        writeDb(db);
      }

      createSession(user.id);
      return NextResponse.json({ user: toPublicUser(user) });
    }

    // 2. Phone / WhatsApp OTP Login flow
    if (provider === 'phone') {
      const phone = typeof input.phone === 'string' ? input.phone.trim() : '';
      const otp = typeof input.otp === 'string' ? input.otp.trim() : '';

      if (!phone || phone.length < 8) {
        return NextResponse.json({ error: 'Please enter a valid phone number.' }, { status: 400 });
      }

      // Step 2a: Generate and store a real 6-digit OTP code
      if (!otp) {
        const code = String(Math.floor(100000 + Math.random() * 900000));
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        saveOtpChallenge(phone, code, expiresAt);

        return NextResponse.json({
          message: `Verification code sent: ${code}`,
          otpSent: true,
          phone,
          devOtp: code,
        });
      }

      // Step 2b: Verify the OTP code
      if (otp.length < 6) {
        return NextResponse.json(
          { error: 'Please enter all 6 digits of the OTP code.' },
          { status: 400 }
        );
      }

      if (!verifyOtpChallenge(phone, otp)) {
        return NextResponse.json(
          { error: 'Invalid or expired verification code.' },
          { status: 401 }
        );
      }

      let user = db.users.find((u) => u.phone === phone);
      if (!user) {
        const rawName =
          typeof input.name === 'string' && input.name.trim()
            ? input.name.trim()
            : `Member ${phone.slice(-4)}`;
        const rawEmail =
          typeof input.email === 'string' && input.email.trim()
            ? input.email.trim().toLowerCase()
            : `phone.${phone.replace(/\D/g, '')}@grossthrift.co`;
        const now = new Date();
        user = {
          id: crypto.randomUUID(),
          name: rawName,
          email: rawEmail,
          phone,
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(rawName)}`,
          isVerified: true,
          memberSince: now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          successfulSplits: 0,
          country: 'United States',
          countryFlag: '🇺🇸',
          isVetted: false,
          passwordHash: hashPassword(crypto.randomBytes(16).toString('hex')),
          createdAt: now.toISOString(),
        };
        db.users.push(user);
        writeDb(db);
      }

      createSession(user.id);
      return NextResponse.json({ user: toPublicUser(user) });
    }

    // 3. Standard Email & Password Login flow
    const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
    const password = typeof input.password === 'string' ? input.password : '';

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const existingUser: StoredUser | undefined = db.users.find(
      (u) => u.email.toLowerCase() === email
    );

    if (existingUser && verifyPassword(password, existingUser.passwordHash)) {
      createSession(existingUser.id);
      return NextResponse.json({
        user: toPublicUser(existingUser),
      });
    }

    // Check Supabase Auth if configured (supports accounts across Vercel serverless cold starts)
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (!error && data.user) {
          const meta = (data.user.user_metadata ?? {}) as Record<string, unknown>;
          const displayName =
            typeof meta.display_name === 'string' && meta.display_name.trim()
              ? meta.display_name.trim()
              : typeof meta.name === 'string' && meta.name.trim()
                ? meta.name.trim()
                : email.split('@')[0];
          const now = new Date(data.user.created_at || Date.now());

          const syncedUser: StoredUser = {
            id: data.user.id,
            name: displayName,
            email: data.user.email || email,
            phone: typeof meta.phone === 'string' ? meta.phone : undefined,
            avatar:
              typeof meta.avatar_url === 'string' && meta.avatar_url
                ? meta.avatar_url
                : `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`,
            isVerified: true,
            memberSince: now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            successfulSplits: existingUser?.successfulSplits ?? 0,
            country: typeof meta.country === 'string' ? meta.country : 'United States',
            countryFlag: typeof meta.country_flag === 'string' ? meta.country_flag : '🇺🇸',
            verificationMethod:
              typeof meta.verification_method === 'string' &&
              ['linkedin', 'email', 'declaration'].includes(meta.verification_method)
                ? (meta.verification_method as 'linkedin' | 'email' | 'declaration')
                : existingUser?.verificationMethod,
            verificationDetail:
              typeof meta.verification_detail === 'string'
                ? meta.verification_detail
                : existingUser?.verificationDetail,
            isVetted:
              typeof meta.is_vetted === 'boolean'
                ? meta.is_vetted
                : Boolean(existingUser?.isVetted),
            passwordHash: hashPassword(password),
            createdAt: now.toISOString(),
          };

          const idx = db.users.findIndex((u) => u.email.toLowerCase() === email);
          if (idx !== -1) {
            db.users[idx] = syncedUser;
          } else {
            db.users.push(syncedUser);
          }
          writeDb(db);

          createSession(syncedUser.id);
          return NextResponse.json({
            user: toPublicUser(syncedUser),
          });
        }
      } catch (err) {
        console.warn('Supabase login fallback error:', err);
      }
    }

    return NextResponse.json(
      { error: 'Invalid email or password. Please check your credentials or create an account.' },
      { status: 401 }
    );
  } catch (err) {
    console.error('Login API error:', err);
    return NextResponse.json(
      { error: 'Unable to process login request right now. Please try again.' },
      { status: 500 }
    );
  }
}
