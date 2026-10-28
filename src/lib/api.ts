import { Listing, User, JoinRequest, ServiceCatalogItem, AppNotification } from '@/types/listing';
import { httpService, listingsApi } from '@/lib/httpService';

const LISTINGS_STORAGE_KEY = 'grossthrift_listings';
const USER_STORAGE_KEY = 'grossthrift_user';
const JOIN_REQUESTS_KEY = 'grossthrift_join_requests';
const JOINED_IDS_KEY = 'grossthrift_joined_ids';
const NOTIFICATIONS_KEY = 'grossthrift_notifications';

export async function fetchListingsFromApi(params?: {
  page?: number;
  pageSize?: number;
  category?: string;
  search?: string;
  sort?: string;
  minPrice?: number;
  maxPrice?: number;
}): Promise<{
  listings: Listing[];
  total: number;
  joinedListingIds?: string[];
  joinRequests?: JoinRequest[];
  notifications?: AppNotification[];
}> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));
  if (params?.category && params.category !== 'All') query.set('category', params.category);
  if (params?.search) query.set('search', params.search);
  if (params?.sort) {
    if (params.sort === 'Price low-high') query.set('sort', 'price_asc');
    else if (params.sort === 'Price high-low') query.set('sort', 'price_desc');
    else query.set('sort', 'newest');
  }
  if (params?.minPrice !== undefined) query.set('minPrice', String(params.minPrice));
  if (params?.maxPrice !== undefined) query.set('maxPrice', String(params.maxPrice));

  const json = await listingsApi.getAll(query.toString());
  const listings = Array.isArray(json.data) ? json.data : [];

  return {
    listings,
    total: json.pagination?.total ?? listings.length,
    joinedListingIds: json.joinedListingIds,
    joinRequests: json.joinRequests,
    notifications: json.notifications,
  };
}

export async function fetchListingById(id: string): Promise<Listing | null> {
  try {
    const json = await listingsApi.getById(id);
    return json.data || null;
  } catch (e) {
    console.warn('Fetch listing detail error:', e);
    return null;
  }
}

export async function fetchServicesCatalog(): Promise<ServiceCatalogItem[]> {
  try {
    const json = await httpService.get<{ data?: ServiceCatalogItem[] }>('/services');
    if (Array.isArray(json.data)) {
      return json.data;
    }
  } catch (error) {
    console.warn('Fetch services error:', error);
  }
  return [];
}

export function getStoredListings(): Listing[] {
  if (typeof window === 'undefined') return [];
  const saved = localStorage.getItem(LISTINGS_STORAGE_KEY);
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved) as Listing[];
    // Filter out any legacy dummy listings (gt-* or host-grossthrift)
    return Array.isArray(parsed)
      ? parsed.filter((l) => !l.id.startsWith('gt-') && l.hostId !== 'host-grossthrift')
      : [];
  } catch {
    return [];
  }
}

export function saveStoredListings(listings: Listing[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LISTINGS_STORAGE_KEY, JSON.stringify(listings));
}

export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  const saved = localStorage.getItem(USER_STORAGE_KEY);
  if (!saved) return null;
  try {
    const parsed = JSON.parse(saved) as User;
    // Reject legacy dummy user IDs
    if (
      parsed.id === 'user-google-101' ||
      parsed.id === 'user-kemi-101' ||
      parsed.id === 'host-member-101'
    ) {
      localStorage.removeItem(USER_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveStoredUser(user: User | null) {
  if (typeof window === 'undefined') return;
  if (user) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_STORAGE_KEY);
  }
}

export function getStoredJoinedIds(): string[] {
  if (typeof window === 'undefined') return [];
  const saved = localStorage.getItem(JOINED_IDS_KEY);
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved) as string[];
    return Array.isArray(parsed) ? parsed.filter((id) => !id.startsWith('gt-')) : [];
  } catch {
    return [];
  }
}

export function saveStoredJoinedIds(ids: string[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(JOINED_IDS_KEY, JSON.stringify(ids));
}

export function getStoredJoinRequests(): JoinRequest[] {
  if (typeof window === 'undefined') return [];
  const saved = localStorage.getItem(JOIN_REQUESTS_KEY);
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved) as JoinRequest[];
    return Array.isArray(parsed) ? parsed.filter((r) => !r.listingId.startsWith('gt-')) : [];
  } catch {
    return [];
  }
}

export function saveStoredJoinRequests(requests: JoinRequest[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(JOIN_REQUESTS_KEY, JSON.stringify(requests));
}

export function getStoredNotifications(): AppNotification[] {
  if (typeof window === 'undefined') return [];
  const saved = localStorage.getItem(NOTIFICATIONS_KEY);
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved) as AppNotification[];
    return Array.isArray(parsed) ? parsed.filter((n) => !n.listingId.startsWith('gt-')) : [];
  } catch {
    return [];
  }
}

export function saveStoredNotifications(notifs: AppNotification[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifs));
}
