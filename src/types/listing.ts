export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar: string;
  isVerified: boolean;
  memberSince: string;
  successfulSplits: number;
  country?: string;
  countryFlag?: string;
  verificationMethod?: string;
  verificationDetail?: string;
  isVetted?: boolean;
}

export type Currency = 'USD' | 'EUR' | 'GBP' | 'NGN';

export type Category =
  | 'Streaming'
  | 'AI Tools'
  | 'Productivity'
  | 'Storage'
  | 'Gaming'
  | 'Other'
  | 'Security';

export interface Listing {
  id: string;
  planName: string;
  category: Category;
  totalCost: number;
  slotsTotal: number;
  slotsFilled: number;
  currency: Currency;
  description: string;
  hostName: string;
  hostAvatar: string;
  hostVerified: boolean;
  hostId: string;
  hostJoined: string;
  hostSuccessfulSplits: number;
  contactMethod: 'WhatsApp' | 'Email';
  contactValue: string;
  createdAt: string;
  logoEmoji?: string;
  country?: string;
  countryFlag?: string;
  rules?: string;
  billingCycle?: string;
  serviceId?: string;
}

export interface JoinRequest {
  id: string;
  listingId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  userContact: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface AppNotification {
  id: string;
  listingId: string;
  planName: string;
  hostName: string;
  contactMethod: 'WhatsApp' | 'Email';
  contactValue: string;
  read: boolean;
  createdAt: string;
}

export type CreateListingInput = {
  planName: string;
  category: Category;
  totalCost: number;
  slotsTotal: number;
  currency?: Currency;
  description?: string;
  contactMethod: 'WhatsApp' | 'Email';
  contactValue: string;
  logoEmoji?: string;
  rules?: string;
  billingCycle?: string;
  serviceId?: string;
};

export interface ServiceCatalogItem {
  id: string;
  name: string;
  category: string;
  logo_url: string | null;
  sharing_policy_note: string | null;
}
