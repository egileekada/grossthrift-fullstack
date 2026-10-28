'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  authApi,
  listingsApi,
  LoginPayload,
  LoginResponse,
  PhoneOtpSendPayload,
  PhoneOtpVerifyPayload,
  SignupPayload,
  SignupResponse,
  OnboardingProfilePayload,
  OnboardingProfileResponse,
  PasswordResetPayload,
  PasswordResetResponse,
  UpdatePasswordPayload,
  UpdatePasswordResponse,
  JoinListingPayload,
  JoinListingResponse,
} from '@/lib/httpService';
import { CreateListingInput, Listing } from '@/types/listing';

export function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation<LoginResponse, Error, LoginPayload>({
    mutationFn: (payload) => authApi.login(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
    },
  });
}

export function useSendPhoneOtpMutation() {
  return useMutation<LoginResponse, Error, PhoneOtpSendPayload>({
    mutationFn: (payload) => authApi.sendPhoneOtp(payload),
  });
}

export function useVerifyPhoneOtpMutation() {
  const queryClient = useQueryClient();

  return useMutation<LoginResponse, Error, PhoneOtpVerifyPayload>({
    mutationFn: (payload) => authApi.verifyPhoneOtp(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
    },
  });
}

export function useSignupMutation() {
  const queryClient = useQueryClient();

  return useMutation<SignupResponse, Error, SignupPayload>({
    mutationFn: (payload) => authApi.signup(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
    },
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();

  return useMutation<{ message: string }, Error, void>({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

export function useForgotPasswordMutation() {
  return useMutation<PasswordResetResponse, Error, PasswordResetPayload>({
    mutationFn: (payload) => authApi.requestPasswordReset(payload),
  });
}

export function useUpdatePasswordMutation() {
  const queryClient = useQueryClient();

  return useMutation<UpdatePasswordResponse, Error, UpdatePasswordPayload>({
    mutationFn: (payload) => authApi.updatePassword(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
    },
  });
}

export function useOnboardingMutation() {
  const queryClient = useQueryClient();

  return useMutation<OnboardingProfileResponse, Error, OnboardingProfilePayload>({
    mutationFn: (payload) => authApi.updateOnboardingProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
    },
  });
}

export function useProfileQuery(enabled = true) {
  return useQuery({
    queryKey: ['profile'],
    queryFn: () => authApi.getProfile(),
    enabled,
    retry: false,
  });
}

export function useListingsQuery() {
  return useQuery({
    queryKey: ['listings'],
    queryFn: () => listingsApi.getAll(),
  });
}

export function useCreateListingMutation() {
  const queryClient = useQueryClient();

  return useMutation<{ data: Listing }, Error, CreateListingInput>({
    mutationFn: (payload) => listingsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
    },
  });
}

export function useJoinListingMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    JoinListingResponse,
    Error,
    { listingId: string; payload?: JoinListingPayload }
  >({
    mutationFn: ({ listingId, payload }) => listingsApi.join(listingId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
    },
  });
}
