import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import {
  User,
  Listing,
  JoinRequest,
  AppNotification,
  CreateListingInput,
} from '@/types/listing';

export interface ApiErrorResponse {
  error?: string;
  message?: string;
}

const axiosInstance: AxiosInstance = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 15000,
});

// Response interceptor to normalize API error messages
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    const serverMessage =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected network error occurred.';
    return Promise.reject(new Error(serverMessage));
  }
);

export const httpService = {
  instance: axiosInstance,

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await axiosInstance.get<T>(url, config);
    return response.data;
  },

  async post<T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig): Promise<T> {
    const response = await axiosInstance.post<T>(url, data, config);
    return response.data;
  },

  async patch<T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig): Promise<T> {
    const response = await axiosInstance.patch<T>(url, data, config);
    return response.data;
  },

  async put<T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig): Promise<T> {
    const response = await axiosInstance.put<T>(url, data, config);
    return response.data;
  },

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await axiosInstance.delete<T>(url, config);
    return response.data;
  },
};

// Auth Payloads & Responses
export interface LoginPayload {
  email?: string;
  password?: string;
  provider?: 'email' | 'google' | 'phone';
  phone?: string;
  otp?: string;
  name?: string;
  avatar?: string;
}

export interface LoginResponse {
  user: User;
  message?: string;
  otpSent?: boolean;
  phone?: string;
  devOtp?: string;
}

export interface SignupPayload {
  name?: string;
  email: string;
  password: string;
  phone?: string;
  country?: string;
  countryFlag?: string;
  verificationMethod?: string;
  verificationDetail?: string;
  isVetted?: boolean;
}

export interface SignupResponse {
  message: string;
  user?: User;
  email?: string;
  needsEmailVerification?: boolean;
}

export interface OnboardingProfilePayload {
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  phone?: string;
  country?: string;
  country_flag?: string;
  verification_method?: string;
  verification_detail?: string;
  is_vetted?: boolean;
}

export interface OnboardingProfileResponse {
  message: string;
  user?: User;
  onboarding?: {
    country?: string;
    countryFlag?: string;
    verificationMethod?: string;
    verificationDetail?: string;
    isVetted?: boolean;
  };
}

export interface PasswordResetPayload {
  email: string;
}

export interface PasswordResetResponse {
  message: string;
  email: string;
}

export interface UpdatePasswordPayload {
  email?: string;
  token?: string;
  password: string;
}

export interface UpdatePasswordResponse {
  message: string;
  user?: User;
}

export interface PhoneOtpSendPayload {
  phone: string;
}

export interface PhoneOtpVerifyPayload {
  phone: string;
  otp: string;
}

export const authApi = {
  login: (payload: LoginPayload) =>
    httpService.post<LoginResponse, LoginPayload>('/auth/login', payload),

  sendPhoneOtp: (payload: PhoneOtpSendPayload) =>
    httpService.post<LoginResponse, LoginPayload>('/auth/login', {
      provider: 'phone',
      phone: payload.phone,
    }),

  verifyPhoneOtp: (payload: PhoneOtpVerifyPayload) =>
    httpService.post<LoginResponse, LoginPayload>('/auth/login', {
      provider: 'phone',
      phone: payload.phone,
      otp: payload.otp,
    }),

  signup: (payload: SignupPayload) =>
    httpService.post<SignupResponse, SignupPayload>('/auth/signup', payload),

  resendConfirmation: (payload: PasswordResetPayload) =>
    httpService.post<PasswordResetResponse, PasswordResetPayload>(
      '/auth/resend-confirmation',
      payload
    ),

  logout: () =>
    httpService.post<{ message: string }>('/auth/logout'),

  requestPasswordReset: (payload: PasswordResetPayload) =>
    httpService.post<PasswordResetResponse, PasswordResetPayload>('/auth/password-reset', payload),

  updatePassword: (payload: UpdatePasswordPayload) =>
    httpService.post<UpdatePasswordResponse, UpdatePasswordPayload>('/auth/update-password', payload),

  updateOnboardingProfile: (payload: OnboardingProfilePayload) =>
    httpService.patch<OnboardingProfileResponse, OnboardingProfilePayload>('/profile', payload),

  getProfile: () =>
    httpService.get<{
      user?: User;
      profile: {
        display_name?: string;
        avatar_url?: string;
        bio?: string;
        rating_avg?: number;
        completed_splits?: number;
      } | null;
      phone: string | null;
      metadata?: {
        country?: string;
        countryFlag?: string;
        verificationMethod?: string | null;
        verificationDetail?: string | null;
        isVetted?: boolean;
      };
    }>('/profile'),
};

export interface ListingsResponse {
  data: Listing[];
  joinedListingIds?: string[];
  joinRequests?: JoinRequest[];
  notifications?: AppNotification[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface JoinListingPayload {
  userName?: string;
  userEmail?: string;
  userPhone?: string;
}

export interface JoinListingResponse {
  data: {
    authorizationUrl: string;
    reference: string;
    membershipId: string;
    currency: 'NGN';
    seatAmountMinor: number;
    feeAmountMinor: number;
    amountMinor: number;
    feePercent: number;
  };
}

export const listingsApi = {
  getAll: (query = '') =>
    httpService.get<ListingsResponse>(`/listings${query ? `?${query}` : ''}`),

  getById: (id: string) =>
    httpService.get<{ data: Listing }>(`/listings/${id}`),

  create: (payload: CreateListingInput) =>
    httpService.post<{ data: Listing }, CreateListingInput>('/listings', payload),

  join: (listingId: string, payload?: JoinListingPayload) =>
    httpService.post<JoinListingResponse, JoinListingPayload | undefined>(
      `/listings/${listingId}/join`,
      payload
    ),

  updateRequestStatus: (requestId: string, status: 'approved' | 'rejected') =>
    httpService.patch<{ data: JoinRequest; listing?: Listing }, { status: 'approved' | 'rejected' }>(
      `/requests/${requestId}`,
      { status }
    ),

  deleteRequestOrListing: (id: string) =>
    axiosInstance.delete<{ message: string; listing?: Listing; deletedListingId?: string }>(
      `/requests/${id}`
    ).then((res) => res.data),

  markNotificationRead: (id: string) =>
    httpService.patch<{ data: AppNotification }>(`/notifications/${id}`),

  updateListing: (
    id: string,
    payload: {
      description?: string;
      rules?: string;
      totalCost?: number;
      visibility?: 'public' | 'private';
      status?: 'active' | 'cancelled';
    }
  ) => httpService.patch<{ data: Listing }>(`/listings/${id}`, payload),

  createInviteLink: (
    listingId: string,
    payload: { expires_in_hours: number; max_uses: number }
  ) =>
    httpService.post<{
      data: {
        id: string;
        listing_id: string;
        status: string;
        expires_at: string;
        max_uses: number;
        use_count: number;
        created_at: string;
        invite_url: string;
      };
    }>(`/listings/${listingId}/invites`, payload),

  revokeInviteLink: (listingId: string, inviteId: string) =>
    httpService.post<{ data: { id: string; status: string } }>(
      `/listings/${listingId}/invites/${inviteId}/revoke`
    ),
};

export interface DashboardMembershipItem {
  id: string;
  listingId: string;
  memberId: string;
  hostId: string;
  isHost: boolean;
  planName: string;
  category: string;
  billingCycle: string;
  pricePerSeat: number;
  status: string;
  seatExpiresAt: string | null;
  invitationSentAt: string | null;
  accessConfirmedAt: string | null;
  createdAt: string;
  memberName: string;
  memberEmail: string;
  memberAvatar: string | null;
  hostName: string;
  authorizationUrl: string | null;
  paymentStatus: string | null;
  paymentReference: string | null;
}

export interface DashboardInviteItem {
  id: string;
  listing_id: string;
  status: string;
  expires_at: string;
  max_uses: number;
  use_count: number;
  created_at: string;
  revoked_at?: string | null;
}

export interface DashboardWalletState {
  availableBalance: number;
  heldBalance: number;
  currency: 'NGN';
  bankName: string;
  accountNumber: string;
  accountName: string;
  transactions: Array<{
    id: string;
    type: string;
    amount: number;
    status: string;
    description?: string;
    created_at: string;
  }>;
  payoutRequests: Array<{
    id: string;
    amount: number;
    bank_name: string;
    account_number: string;
    account_name: string;
    status: string;
    created_at: string;
  }>;
}

export interface DashboardResponse {
  memberships: DashboardMembershipItem[];
  invites: DashboardInviteItem[];
  wallet: DashboardWalletState;
  disputes: Array<{
    id: string;
    membership_id: string;
    listing_id: string;
    reason: string;
    description: string;
    status: string;
    resolution_note?: string;
    created_at: string;
  }>;
  ratings: Array<{
    id: string;
    membership_id: string;
    stars: number;
    comment?: string;
  }>;
}

export interface PrivateInvitePreview {
  listing_id: string;
  service_name: string;
  service_category: string;
  service_logo_url: string | null;
  plan_type: string;
  total_cost: number;
  billing_cycle: string;
  seats_open: number;
  price_per_seat: number;
  description: string | null;
  rules: string | null;
  host_type: string;
  host_display_name: string | null;
  host_avatar_url: string | null;
  host_rating_avg: number | null;
  host_completed_splits: number;
  expires_at: string;
  uses_remaining: number;
}

export const prdApi = {
  getDashboard: () => httpService.get<DashboardResponse>('/dashboard'),

  markMemberInvited: (membershipId: string) =>
    httpService.post<{ message: string }>(`/memberships/${membershipId}/mark-invited`),

  confirmMemberAccess: (membershipId: string) =>
    httpService.post<{ message: string }>(`/memberships/${membershipId}/confirm-access`),

  leaveSplit: (membershipOrListingId: string) =>
    httpService.post<{ message: string }>(`/memberships/${membershipOrListingId}/leave`),

  saveBankDetails: (payload: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  }) =>
    httpService.patch<{
      message: string;
      data: { bankName: string; accountNumber: string; accountName: string };
    }>('/wallet', payload),

  requestPayout: (payload: {
    amount: number;
    bankName: string;
    accountNumber: string;
    accountName: string;
  }) => httpService.post<{ message: string }>('/wallet', payload),

  openDispute: (payload: {
    membershipId: string;
    reason: string;
    description: string;
    evidenceFiles?: Array<{ name: string; dataUrl: string }>;
  }) => httpService.post<{ message: string }>('/disputes', payload),

  submitRating: (payload: {
    membershipId: string;
    stars: number;
    comment?: string;
  }) => httpService.post<{ message: string }>('/ratings', payload),

  getInvitePreview: (token: string) =>
    httpService.get<{ data: PrivateInvitePreview }>(`/invites/${token}`),

  acceptInvite: (token: string) =>
    httpService.post<{
      data: {
        id: string;
        listing_id: string;
        status: string;
        price_per_seat: number;
        seat_expires_at: string;
        authorizationUrl?: string;
        reference?: string;
        seatAmountMinor?: number;
        feeAmountMinor?: number;
        amountMinor?: number;
        feePercent?: number;
      };
      next: string;
    }>(`/invites/${token}/accept`),

  getAdminOverview: () =>
    httpService.get<{
      listings: Array<Record<string, unknown>>;
      memberships: Array<Record<string, unknown>>;
      payments: Array<Record<string, unknown>>;
      disputes: Array<Record<string, unknown>>;
      payouts: Array<Record<string, unknown>>;
    }>('/admin'),

  runAdminAction: (payload: Record<string, unknown>) =>
    httpService.post<{ message: string; data?: unknown }>('/admin', payload),

  runCronReconcile: () =>
    httpService.get<{
      reconciledAt: string;
      expiredHoldsReleased: number;
      autoConfirmedAfter48h: number;
      overdueHostInvites24h: number;
    }>('/cron/reconcile'),
};

export default httpService;

