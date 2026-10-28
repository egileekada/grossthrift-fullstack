import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import {
  Listing,
  User,
  JoinRequest,
  AppNotification,
  Category,
  Currency,
  ServiceCatalogItem,
} from '@/types/listing';

export const SESSION_COOKIE_NAME = 'gt_session';
export const OTP_COOKIE_NAME = 'gt_otp';
export const RESET_COOKIE_NAME = 'gt_pwd_reset';

const SIGNING_SECRET =
  process.env.AUTH_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  process.env.SUPABASE_JWT_SECRET ||
  'grossthrift-serverless-hmac-secret-key-2026';

export interface StoredUser extends User {
  passwordHash: string;
  createdAt: string;
}

export interface StoredSession {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

export interface StoredOtp {
  phone: string;
  code: string;
  expiresAt: string;
}

export interface StoredPasswordResetToken {
  email: string;
  token: string;
  expiresAt: string;
}

export interface StoredJoinRequest extends JoinRequest {
  userId: string;
}

export interface StoredNotification extends AppNotification {
  userId: string;
}

export interface DatabaseSchema {
  users: StoredUser[];
  sessions: StoredSession[];
  otpCodes: StoredOtp[];
  passwordResetTokens: StoredPasswordResetToken[];
  services: ServiceCatalogItem[];
  listings: Listing[];
  joinRequests: StoredJoinRequest[];
  notifications: StoredNotification[];
}

declare global {
  // eslint-disable-next-line no-var
  var __grossThriftDbCache: DatabaseSchema | undefined;
}

const DEFAULT_SERVICES: ServiceCatalogItem[] = [
  {
    id: 'srv-youtube-premium',
    name: 'YouTube Premium',
    category: 'Streaming',
    logo_url: null,
    sharing_policy_note: 'Up to 5 family members in the same household region.',
  },
  {
    id: 'srv-spotify-family',
    name: 'Spotify Family',
    category: 'Streaming',
    logo_url: null,
    sharing_policy_note: 'Up to 6 Premium accounts for family members.',
  },
  {
    id: 'srv-netflix-4k',
    name: 'Netflix Premium 4K',
    category: 'Streaming',
    logo_url: null,
    sharing_policy_note: '4 simultaneous Ultra HD streams with isolated profiles.',
  },
  {
    id: 'srv-chatgpt-team',
    name: 'ChatGPT Plus Team',
    category: 'AI Tools',
    logo_url: null,
    sharing_policy_note: 'Isolated workspace seats with GPT-4o access.',
  },
  {
    id: 'srv-adobe-cc',
    name: 'Adobe Creative Cloud',
    category: 'Productivity',
    logo_url: null,
    sharing_policy_note: 'Multi-seat team license for Creative Cloud apps.',
  },
  {
    id: 'srv-ms365-family',
    name: 'Microsoft 365 Family',
    category: 'Productivity',
    logo_url: null,
    sharing_policy_note: 'Up to 6 users with 1TB OneDrive cloud storage each.',
  },
  {
    id: 'srv-apple-one',
    name: 'Apple One Premier',
    category: 'Storage',
    logo_url: null,
    sharing_policy_note: 'Up to 6 family members via Apple Family Sharing.',
  },
  {
    id: 'srv-canva-pro',
    name: 'Canva Pro',
    category: 'Productivity',
    logo_url: null,
    sharing_policy_note: 'Shared team brand kit and premium templates.',
  },
  {
    id: 'srv-nordvpn',
    name: 'NordVPN',
    category: 'Security',
    logo_url: null,
    sharing_policy_note: 'Up to 10 simultaneous device connections.',
  },
  {
    id: 'srv-notion-plus',
    name: 'Notion Plus',
    category: 'Productivity',
    logo_url: null,
    sharing_policy_note: 'Collaborative workspace seats.',
  },
];

const LOCAL_DB_DIR = path.join(process.cwd(), '.data');
const LOCAL_DB_FILE = path.join(LOCAL_DB_DIR, 'db.json');
const TMP_DB_DIR = path.join(os.tmpdir(), 'grossthrift-data');
const TMP_DB_FILE = path.join(TMP_DB_DIR, 'db.json');

function createEmptyDb(): DatabaseSchema {
  return {
    users: [],
    sessions: [],
    otpCodes: [],
    passwordResetTokens: [],
    services: DEFAULT_SERVICES,
    listings: [],
    joinRequests: [],
    notifications: [],
  };
}

function normalizeParsedDb(parsed: Partial<DatabaseSchema>): DatabaseSchema {
  return {
    users: Array.isArray(parsed.users) ? parsed.users : [],
    sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
    otpCodes: Array.isArray(parsed.otpCodes) ? parsed.otpCodes : [],
    passwordResetTokens: Array.isArray(parsed.passwordResetTokens)
      ? parsed.passwordResetTokens
      : [],
    services:
      Array.isArray(parsed.services) && parsed.services.length > 0
        ? parsed.services
        : DEFAULT_SERVICES,
    listings: Array.isArray(parsed.listings) ? parsed.listings : [],
    joinRequests: Array.isArray(parsed.joinRequests) ? parsed.joinRequests : [],
    notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
  };
}

function resolveWritablePaths(): { dir: string; file: string } {
  // On Vercel or serverless platforms, process.cwd() (/var/task) is read-only.
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return { dir: TMP_DB_DIR, file: TMP_DB_FILE };
  }
  try {
    if (!fs.existsSync(LOCAL_DB_DIR)) {
      fs.mkdirSync(LOCAL_DB_DIR, { recursive: true });
    }
    fs.accessSync(LOCAL_DB_DIR, fs.constants.W_OK);
    return { dir: LOCAL_DB_DIR, file: LOCAL_DB_FILE };
  } catch {
    return { dir: TMP_DB_DIR, file: TMP_DB_FILE };
  }
}

function ensureDbFile(): DatabaseSchema {
  const { dir, file } = resolveWritablePaths();

  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<DatabaseSchema>;
      const normalized = normalizeParsedDb(parsed);
      globalThis.__grossThriftDbCache = normalized;
      return normalized;
    }

    // Seed from read-only bundled .data/db.json if present
    if (file !== LOCAL_DB_FILE && fs.existsSync(LOCAL_DB_FILE)) {
      const seedRaw = fs.readFileSync(LOCAL_DB_FILE, 'utf-8');
      const seedParsed = JSON.parse(seedRaw) as Partial<DatabaseSchema>;
      const seeded = normalizeParsedDb(seedParsed);
      fs.writeFileSync(file, JSON.stringify(seeded, null, 2), 'utf-8');
      globalThis.__grossThriftDbCache = seeded;
      return seeded;
    }

    const initialDb = globalThis.__grossThriftDbCache ?? createEmptyDb();
    fs.writeFileSync(file, JSON.stringify(initialDb, null, 2), 'utf-8');
    globalThis.__grossThriftDbCache = initialDb;
    return initialDb;
  } catch {
    if (!globalThis.__grossThriftDbCache) {
      globalThis.__grossThriftDbCache = createEmptyDb();
    }
    return globalThis.__grossThriftDbCache;
  }
}

export function readDb(): DatabaseSchema {
  return ensureDbFile();
}

export function writeDb(db: DatabaseSchema): void {
  globalThis.__grossThriftDbCache = db;
  const { dir, file } = resolveWritablePaths();
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(file, JSON.stringify(db, null, 2), 'utf-8');
  } catch {
    // Fallback to in-memory cache when filesystem write is restricted
  }
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, originalHash] = storedHash.split(':');
    if (!salt || !originalHash) return false;
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'));
  } catch {
    return false;
  }
}

export function toPublicUser(user: StoredUser): User {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, createdAt, ...publicUser } = user;
  return publicUser;
}

function signPayload<T>(payload: T): string {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', SIGNING_SECRET)
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

function verifySignedPayload<T>(signed: string): T | null {
  try {
    const parts = signed.split('.');
    if (parts.length !== 2) return null;
    const [encoded, sig] = parts;
    const expectedSig = crypto
      .createHmac('sha256', SIGNING_SECRET)
      .update(encoded)
      .digest('base64url');
    if (
      sig.length !== expectedSig.length ||
      !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))
    ) {
      return null;
    }
    const json = Buffer.from(encoded, 'base64url').toString('utf-8');
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

interface SignedSessionPayload {
  token: string;
  user: StoredUser;
  expiresAt: string;
}

export function createSession(userId: string): string {
  const db = readDb();
  const rawToken = crypto.randomBytes(24).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

  db.sessions = db.sessions.filter(
    (s) => new Date(s.expiresAt).getTime() > now.getTime()
  );

  db.sessions.push({
    token: rawToken,
    userId,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  });

  writeDb(db);

  const user = db.users.find((u) => u.id === userId);
  const cookieValue = user
    ? signPayload<SignedSessionPayload>({
        token: rawToken,
        user,
        expiresAt: expiresAt.toISOString(),
      })
    : rawToken;

  try {
    const cookieStore = cookies();
    cookieStore.set(SESSION_COOKIE_NAME, cookieValue, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      expires: expiresAt,
    });
  } catch {
    // Ignore if called outside request context
  }

  return cookieValue;
}

export function clearSession(): void {
  try {
    const cookieStore = cookies();
    const rawCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (rawCookie) {
      const signed = verifySignedPayload<SignedSessionPayload>(rawCookie);
      const tokenToClear = signed ? signed.token : rawCookie;
      const db = readDb();
      db.sessions = db.sessions.filter((s) => s.token !== tokenToClear);
      writeDb(db);
    }
    cookieStore.delete(SESSION_COOKIE_NAME);
  } catch {
    // Ignore if called outside request context
  }
}

export function getAuthenticatedUser(): StoredUser | null {
  try {
    const cookieStore = cookies();
    const rawCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!rawCookie) return null;

    const db = readDb();
    const now = Date.now();

    // 1. Check signed stateless session token (works across serverless instances on Vercel)
    const signed = verifySignedPayload<SignedSessionPayload>(rawCookie);
    if (signed && new Date(signed.expiresAt).getTime() > now && signed.user?.id) {
      let existingUser = db.users.find(
        (u) =>
          u.id === signed.user.id ||
          u.email.toLowerCase() === signed.user.email.toLowerCase()
      );
      if (!existingUser) {
        existingUser = signed.user;
        db.users.push(existingUser);
        writeDb(db);
      }
      return existingUser;
    }

    // 2. Fallback to plain token lookup in db.sessions
    const session = db.sessions.find(
      (s) => s.token === rawCookie && new Date(s.expiresAt).getTime() > now
    );
    if (!session) return null;

    const user = db.users.find((u) => u.id === session.userId);
    return user || null;
  } catch {
    return null;
  }
}

export function saveOtpChallenge(phone: string, code: string, expiresAt: string): void {
  const db = readDb();
  db.otpCodes = db.otpCodes.filter((item) => item.phone !== phone);
  db.otpCodes.push({ phone, code, expiresAt });
  writeDb(db);

  try {
    const cookieStore = cookies();
    cookieStore.set(OTP_COOKIE_NAME, signPayload<StoredOtp>({ phone, code, expiresAt }), {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      expires: new Date(expiresAt),
    });
  } catch {
    // Ignore outside request context
  }
}

export function verifyOtpChallenge(phone: string, code: string): boolean {
  const db = readDb();
  const now = Date.now();
  const storedOtp = db.otpCodes.find(
    (item) => item.phone === phone && new Date(item.expiresAt).getTime() > now
  );
  if (storedOtp && storedOtp.code === code) {
    db.otpCodes = db.otpCodes.filter((item) => item.phone !== phone);
    writeDb(db);
    return true;
  }

  try {
    const cookieStore = cookies();
    const raw = cookieStore.get(OTP_COOKIE_NAME)?.value;
    if (raw) {
      const signed = verifySignedPayload<StoredOtp>(raw);
      if (
        signed &&
        signed.phone === phone &&
        signed.code === code &&
        new Date(signed.expiresAt).getTime() > now
      ) {
        cookieStore.delete(OTP_COOKIE_NAME);
        return true;
      }
    }
  } catch {
    // Ignore
  }

  return false;
}

export function savePasswordResetChallenge(
  email: string,
  token: string,
  expiresAt: string
): void {
  const db = readDb();
  db.passwordResetTokens = db.passwordResetTokens.filter(
    (item) => item.email.toLowerCase() !== email.toLowerCase()
  );
  db.passwordResetTokens.push({ email: email.toLowerCase(), token, expiresAt });
  writeDb(db);

  try {
    const cookieStore = cookies();
    cookieStore.set(
      RESET_COOKIE_NAME,
      signPayload<StoredPasswordResetToken>({
        email: email.toLowerCase(),
        token,
        expiresAt,
      }),
      {
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        expires: new Date(expiresAt),
      }
    );
  } catch {
    // Ignore
  }
}

export function verifyPasswordResetChallenge(email: string, token: string): boolean {
  const db = readDb();
  const now = Date.now();
  const normalizedEmail = email.toLowerCase();

  const storedReset = db.passwordResetTokens.find(
    (item) =>
      item.email.toLowerCase() === normalizedEmail &&
      new Date(item.expiresAt).getTime() > now
  );

  if (storedReset && storedReset.token === token) {
    db.passwordResetTokens = db.passwordResetTokens.filter(
      (item) => item.email.toLowerCase() !== normalizedEmail
    );
    writeDb(db);
    return true;
  }

  try {
    const cookieStore = cookies();
    const raw = cookieStore.get(RESET_COOKIE_NAME)?.value;
    if (raw) {
      const signed = verifySignedPayload<StoredPasswordResetToken>(raw);
      if (
        signed &&
        signed.email.toLowerCase() === normalizedEmail &&
        signed.token === token &&
        new Date(signed.expiresAt).getTime() > now
      ) {
        cookieStore.delete(RESET_COOKIE_NAME);
        return true;
      }
    }
  } catch {
    // Ignore
  }

  return false;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}

export function normalizeCategory(cat?: string): Category {
  const valid: Category[] = [
    'Streaming',
    'AI Tools',
    'Productivity',
    'Storage',
    'Gaming',
    'Security',
    'Other',
  ];
  if (cat && valid.includes(cat as Category)) {
    return cat as Category;
  }
  return 'Streaming';
}

export function normalizeCurrency(cur?: string): Currency {
  const valid: Currency[] = ['USD', 'EUR', 'GBP', 'NGN'];
  if (cur && valid.includes(cur as Currency)) {
    return cur as Currency;
  }
  return 'USD';
}
