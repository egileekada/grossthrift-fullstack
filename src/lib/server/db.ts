import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/server/supabaseAdmin';
import { Category, Currency, ServiceCatalogItem, User } from '@/types/listing';

export const DEFAULT_LAUNCH_SERVICES: Array<{
  name: string;
  category: Category;
  sharing_policy_note: string;
}> = [
    {
      name: 'Netflix',
      category: 'Streaming',
      sharing_policy_note:
        'Only list a plan whose current terms expressly allow sharing with the intended members. Use the provider’s official invitation flow.',
    },
    {
      name: 'Spotify',
      category: 'Streaming',
      sharing_policy_note:
        'Only list a plan whose current terms expressly allow sharing with the intended members. Use the provider’s official invitation flow.',
    },
    {
      name: 'YouTube',
      category: 'Streaming',
      sharing_policy_note:
        'Only list a plan whose current terms expressly allow sharing with the intended members. Use the provider’s official invitation flow.',
    },
    {
      name: 'ChatGPT',
      category: 'AI Tools',
      sharing_policy_note:
        'Only list a plan whose current terms expressly allow adding the intended members. Never share account passwords.',
    },
    {
      name: 'Adobe',
      category: 'Productivity',
      sharing_policy_note:
        'Only list a plan whose current terms expressly allow adding the intended members. Use the provider’s official invitation flow.',
    },
    {
      name: 'Canva',
      category: 'Productivity',
      sharing_policy_note:
        'Only list a plan whose current terms expressly allow adding the intended members. Use the provider’s official invitation flow.',
    },
    {
      name: 'Microsoft 365',
      category: 'Productivity',
      sharing_policy_note:
        'Only list a plan whose current terms expressly allow sharing with family/group members via official Microsoft invitations.',
    },
    {
      name: 'Apple One',
      category: 'Storage',
      sharing_policy_note:
        'Only list a plan whose current terms expressly allow Apple Family Sharing invitations.',
    },
    {
      name: 'Xbox',
      category: 'Gaming',
      sharing_policy_note:
        'Only list a plan whose current terms expressly allow sharing with the intended members. Use the provider’s official invitation flow.',
    },
    {
      name: 'NordVPN',
      category: 'Security',
      sharing_policy_note:
        'Only list a multi-user plan whose terms allow seat invitations. Never share primary account passwords.',
    },
    {
      name: 'Notion',
      category: 'Productivity',
      sharing_policy_note:
        'Only list workspace plans that officially support adding members via workspace invitation.',
    },
  ];

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

export async function ensureUserProfile(user: {
  id: string;
  name: string;
  avatar?: string;
  phone?: string;
}): Promise<void> {
  const clients = [
    createClient(),
    ...(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
      ? [createAdminClient()]
      : []),
  ];

  for (const client of clients) {
    try {
      const { data: existing, error: readErr } = await client
        .from('profiles')
        .select('id, display_name')
        .eq('id', user.id)
        .maybeSingle();

      if (!readErr && existing?.display_name?.trim()) {
        break;
      }

      if (existing) {
        const { error: updateErr } = await client
          .from('profiles')
          .update({
            display_name: user.name || 'Member',
            ...(user.avatar ? { avatar_url: user.avatar } : {}),
          })
          .eq('id', user.id);
        if (!updateErr) break;
      } else {
        const { error: upsertErr } = await client.from('profiles').upsert(
          {
            id: user.id,
            display_name: user.name || 'Member',
            avatar_url: user.avatar || null,
          },
          { onConflict: 'id' }
        );
        if (!upsertErr) break;
      }
    } catch (err) {
      console.warn('ensureUserProfile warning:', err);
    }
  }

  for (const client of clients) {
    try {
      const { data: existingPrivate, error: privReadErr } = await client
        .from('profile_private')
        .select('id, phone')
        .eq('id', user.id)
        .maybeSingle();

      if (!privReadErr && existingPrivate?.phone?.trim()) {
        break;
      }

      const phoneValue =
        user.phone?.trim() || existingPrivate?.phone?.trim() || '+2348000000000';

      if (existingPrivate) {
        const { error: privUpdateErr } = await client
          .from('profile_private')
          .update({ phone: phoneValue })
          .eq('id', user.id);
        if (!privUpdateErr) break;
      } else {
        const { error: privUpsertErr } = await client
          .from('profile_private')
          .upsert({ id: user.id, phone: phoneValue }, { onConflict: 'id' });
        if (!privUpsertErr) break;
      }
    } catch {
      // Ignore if profile_private does not exist or is restricted
    }
  }
}

export async function ensureServiceCatalog(): Promise<ServiceCatalogItem[]> {
  const supabase = createClient();
  const { data: existing } = await supabase
    .from('services')
    .select('id,name,category,logo_url,sharing_policy_note')
    .eq('is_active', true)
    .order('name');

  const currentList = (existing ?? []) as ServiceCatalogItem[];
  const existingNames = new Set(currentList.map((s) => s.name.toLowerCase()));
  const missing = DEFAULT_LAUNCH_SERVICES.filter(
    (seed) => !existingNames.has(seed.name.toLowerCase())
  );

  if (
    missing.length > 0 &&
    (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)
  ) {
    try {
      const admin = createAdminClient();
      await admin.from('services').insert(
        missing.map((item) => ({
          name: item.name,
          category: item.category,
          logo_url: null,
          sharing_policy_note: item.sharing_policy_note,
          is_active: true,
        }))
      );
      const { data: refreshed } = await admin
        .from('services')
        .select('id,name,category,logo_url,sharing_policy_note')
        .eq('is_active', true)
        .order('name');
      if (refreshed) return refreshed as ServiceCatalogItem[];
    } catch (err) {
      console.warn('ensureServiceCatalog seed warning:', err);
    }
  }

  return currentList;
}

export async function getAuthenticatedUser(): Promise<StoredUser | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user?.email) return null;

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

    if (!profile) {
      await ensureUserProfile({ id: user.id, name, avatar });
    }

    return {
      id: user.id,
      name,
      email: user.email,
      phone:
        typeof metadata.phone === 'string' && metadata.phone.trim()
          ? metadata.phone.trim()
          : undefined,
      avatar,
      isVerified: Boolean(user.email_confirmed_at),
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

export async function isUserAdmin(user: { id: string; email?: string }): Promise<boolean> {
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (user.email && adminEmails.includes(user.email.toLowerCase())) {
    return true;
  }

  try {
    const supabase = createClient();
    const [{ data: authData }, { data: profile }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
    ]);

    if (authData?.user?.app_metadata?.role === 'admin') {
      return true;
    }
    if (profile && (profile as { role?: string }).role === 'admin') {
      return true;
    }
  } catch {
    // Fall back safely if role column has not been added yet
  }

  return false;
}

export async function isUserSuspended(userId: string): Promise<boolean> {
  try {
    const supabase = createClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_suspended')
      .eq('id', userId)
      .maybeSingle();
    return Boolean((profile as { is_suspended?: boolean } | null)?.is_suspended);
  } catch {
    return false;
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
