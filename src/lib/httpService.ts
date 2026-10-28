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
  resetToken: string;
  resetUrl: string;
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
    listing: Listing;
    joinRequest: JoinRequest;
    notification: AppNotification;
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
};

export default httpService;
