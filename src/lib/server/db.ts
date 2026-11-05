import { createClient } from '@/lib/supabase/server';
import { Category, Currency, User } from '@/types/listing';

// Kept as a compatible server-side shape for API responses. Credentials and
// profile data are owned by Supabase Auth and Postgres, never a local file.
export interface StoredUser extends User {
  passwordHash: string;
  createdAt: string;
}

export function toPublicUser(user: StoredUser): User {
  const { passwordHash, createdAt, ...publicUser } = user;
  void passwordHash;
  void createdAt;
  return publicUser;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}

export async function getAuthenticatedUser(): Promise<StoredUser | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user?.email || !user.email_confirmed_at) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, avatar_url, completed_splits')
      .eq('id', user.id)
      .maybeSingle();

    const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
    const name =
      profile?.display_name ||
      (typeof metadata.display_name === 'string' && metadata.display_name.trim()) ||
      (typeof metadata.name === 'string' && metadata.name.trim()) ||
      user.email.split('@')[0];
    const avatar =
      profile?.avatar_url ||
      (typeof metadata.avatar_url === 'string' && metadata.avatar_url) ||
      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;
    const createdAt = user.created_at || new Date().toISOString();

    return {
      id: user.id,
      name,
      email: user.email,
      phone:
        typeof metadata.phone === 'string' && metadata.phone.trim()
          ? metadata.phone.trim()
          : undefined,
      avatar,
      isVerified: true,
      memberSince: new Date(createdAt).toLocaleDateString('en-NG', {
        month: 'short',
        year: 'numeric',
      }),
      successfulSplits: Number(profile?.completed_splits ?? 0),
      country: typeof metadata.country === 'string' ? metadata.country : 'Nigeria',
      countryFlag:
        typeof metadata.country_flag === 'string' ? metadata.country_flag : '🇳🇬',
      verificationMethod:
        typeof metadata.verification_method === 'string'
          ? metadata.verification_method
          : undefined,
      verificationDetail:
        typeof metadata.verification_detail === 'string'
          ? metadata.verification_detail
          : undefined,
      isVetted: typeof metadata.is_vetted === 'boolean' ? metadata.is_vetted : false,
      passwordHash: '',
      createdAt,
    };
  } catch {
    return null;
  }
}

export function normalizeCategory(category?: string): Category {
  const allowed: Category[] = [
    'Streaming',
    'AI Tools',
    'Productivity',
    'Storage',
    'Gaming',
    'Security',
    'Other',
  ];
  return category && allowed.includes(category as Category)
    ? (category as Category)
    : 'Streaming';
}

export function normalizeCurrency(currency?: string): Currency {
  const allowed: Currency[] = ['USD', 'EUR', 'GBP', 'NGN'];
  return currency && allowed.includes(currency as Currency)
    ? (currency as Currency)
    : 'NGN';
}
