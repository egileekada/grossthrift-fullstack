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
} from '@/lib/server/db';

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
      db.otpCodes = db.otpCodes.filter((item) => item.phone !== phone);
      db.otpCodes.push({ phone, code, expiresAt });
      writeDb(db);

      return NextResponse.json({
        message: `Verification code sent: ${code}`,
        otpSent: true,
        phone,
        devOtp: code,
      });
    }

    // Step 2b: Verify the OTP code
    if (otp.length < 6) {
      return NextResponse.json({ error: 'Please enter all 6 digits of the OTP code.' }, { status: 400 });
    }

    const storedOtp = db.otpCodes.find(
      (item) => item.phone === phone && new Date(item.expiresAt).getTime() > Date.now()
    );

    if (!storedOtp || storedOtp.code !== otp) {
      return NextResponse.json({ error: 'Invalid or expired verification code.' }, { status: 401 });
    }

    db.otpCodes = db.otpCodes.filter((item) => item.phone !== phone);

    let user = db.users.find((u) => u.phone === phone);
    if (!user) {
      const rawName = typeof input.name === 'string' && input.name.trim() ? input.name.trim() : `Member ${phone.slice(-4)}`;
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
    }

    writeDb(db);
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

  if (!existingUser || !verifyPassword(password, existingUser.passwordHash)) {
    return NextResponse.json(
      { error: 'Invalid email or password. Please check your credentials or create an account.' },
      { status: 401 }
    );
  }

  createSession(existingUser.id);

  return NextResponse.json({
    user: toPublicUser(existingUser),
  });
}
