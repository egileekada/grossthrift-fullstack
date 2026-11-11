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
  prdApi,
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

export function useResendConfirmationMutation() {
  return useMutation<PasswordResetResponse, Error, PasswordResetPayload>({
    mutationFn: (payload) => authApi.resendConfirmation(payload),
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
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDashboardQuery(enabled = true) {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => prdApi.getDashboard(),
    enabled,
  });
}

export function useMarkInvitedMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (membershipId: string) => prdApi.markMemberInvited(membershipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
    },
  });
}

export function useConfirmAccessMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (membershipId: string) => prdApi.confirmMemberAccess(membershipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

export function useLeaveSplitMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => prdApi.leaveSplit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
    },
  });
}

export function useCreateInviteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      listingId,
      expires_in_hours,
      max_uses,
    }: {
      listingId: string;
      expires_in_hours: number;
      max_uses: number;
    }) => listingsApi.createInviteLink(listingId, { expires_in_hours, max_uses }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
    },
  });
}

export function useRevokeInviteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ listingId, inviteId }: { listingId: string; inviteId: string }) =>
      listingsApi.revokeInviteLink(listingId, inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useSaveBankDetailsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { bankName: string; accountNumber: string; accountName: string }) =>
      prdApi.saveBankDetails(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useRequestPayoutMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      amount: number;
      bankName: string;
      accountNumber: string;
      accountName: string;
    }) => prdApi.requestPayout(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useOpenDisputeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { membershipId: string; reason: string; description: string }) =>
      prdApi.openDispute(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useSubmitRatingMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { membershipId: string; stars: number; comment?: string }) =>
      prdApi.submitRating(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
    },
  });
}
