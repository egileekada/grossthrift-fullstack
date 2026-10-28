import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { Listing, User, JoinRequest, AppNotification, Category, Currency, ServiceCatalogItem } from '@/types/listing';

export const SESSION_COOKIE_NAME = 'gt_session';

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
  services: ServiceCatalogItem[];
  listings: Listing[];
  joinRequests: StoredJoinRequest[];
  notifications: StoredNotification[];
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

const DB_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DB_DIR, 'db.json');

function ensureDbFile(): DatabaseSchema {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    const initialDb: DatabaseSchema = {
      users: [],
      sessions: [],
      otpCodes: [],
      services: DEFAULT_SERVICES,
      listings: [],
      joinRequests: [],
      notifications: [],
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
    return initialDb;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<DatabaseSchema>;
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      otpCodes: Array.isArray(parsed.otpCodes) ? parsed.otpCodes : [],
      services: Array.isArray(parsed.services) && parsed.services.length > 0 ? parsed.services : DEFAULT_SERVICES,
      listings: Array.isArray(parsed.listings) ? parsed.listings : [],
      joinRequests: Array.isArray(parsed.joinRequests) ? parsed.joinRequests : [],
      notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
    };
  } catch {
    const fallbackDb: DatabaseSchema = {
      users: [],
      sessions: [],
      otpCodes: [],
      services: DEFAULT_SERVICES,
      listings: [],
      joinRequests: [],
      notifications: [],
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(fallbackDb, null, 2), 'utf-8');
    return fallbackDb;
  }
}

export function readDb(): DatabaseSchema {
  return ensureDbFile();
}

export function writeDb(db: DatabaseSchema): void {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, originalHash] = storedHash.split(':');
  if (!salt || !originalHash) return false;
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'));
}

export function toPublicUser(user: StoredUser): User {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, createdAt, ...publicUser } = user;
  return publicUser;
}

export function createSession(userId: string): string {
  const db = readDb();
  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

  db.sessions = db.sessions.filter(
    (s) => new Date(s.expiresAt).getTime() > now.getTime()
  );

  db.sessions.push({
    token,
    userId,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  });

  writeDb(db);

  try {
    const cookieStore = cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      expires: expiresAt,
    });
  } catch {
    // Ignore if called outside request context
  }

  return token;
}

export function clearSession(): void {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (token) {
      const db = readDb();
      db.sessions = db.sessions.filter((s) => s.token !== token);
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
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const db = readDb();
    const now = Date.now();
    const session = db.sessions.find(
      (s) => s.token === token && new Date(s.expiresAt).getTime() > now
    );
    if (!session) return null;

    const user = db.users.find((u) => u.id === session.userId);
    return user || null;
  } catch {
    return null;
  }
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
