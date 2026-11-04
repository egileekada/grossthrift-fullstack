import { Category, Currency, Listing } from '@/types/listing';
import { getPlatformFeePercent } from '@/lib/server/paystack';

type DiscoveryRow = {
  id: string;
  host_type: string;
  service_id: string;
  plan_type: string;
  total_cost: number | string;
  billing_cycle: string;
  seats_total: number;
  seats_open: number;
  price_per_seat: number | string;
  description: string | null;
  rules: string | null;
  status: string;
  visibility: string;
  created_at: string;
  service_name: string;
  service_category: string;
  service_logo_url: string | null;
  host_display_name: string | null;
  host_avatar_url: string | null;
  host_completed_splits: number | null;
  host_id?: string;
  currency?: string | null;
};

export function mapDiscoveryListing(
  row: DiscoveryRow,
  identity?: { hostId?: string; currency?: string | null }
): Listing {
  const category = row.service_category as Category;
  const currency = (identity?.currency ?? row.currency ?? 'USD') as Currency;
  const slotsTotal = Number(row.seats_total);
  const seatsOpen = Number(row.seats_open);
  const platformFeePercent = currency === 'NGN' ? getPlatformFeePercent() : null;
  const seatAmountMinor = Math.round(Number(row.price_per_seat) * 100);
  const platformFeeAmount = platformFeePercent === null
    ? undefined
    : Math.round(seatAmountMinor * platformFeePercent / 100) / 100;

  return {
    id: row.id,
    planName: row.plan_type || row.service_name,
    category,
    totalCost: Number(row.total_cost),
    slotsTotal,
    slotsFilled: Math.max(0, slotsTotal - seatsOpen),
    currency,
    description: row.description ?? '',
    hostName: row.host_display_name || 'GrossThrift member',
    hostAvatar: row.host_avatar_url || '',
    hostVerified: row.host_type === 'official',
    hostId: identity?.hostId ?? row.host_id ?? '',
    hostJoined: '',
    hostSuccessfulSplits: Number(row.host_completed_splits ?? 0),
    contactMethod: 'Email',
    contactValue: '',
    createdAt: row.created_at,
    country: undefined,
    countryFlag: undefined,
    rules: row.rules ?? undefined,
    billingCycle: row.billing_cycle,
    serviceId: row.service_id,
    platformFeePercent: platformFeePercent ?? undefined,
    platformFeeAmount,
    checkoutTotal: platformFeeAmount === undefined
      ? undefined
      : Number(row.price_per_seat) + platformFeeAmount,
  };
}
