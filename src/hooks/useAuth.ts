'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  authApi,
  listingsApi,
  LoginPayload,
  LoginResponse,
  SignupPayload,
  SignupResponse,
  OnboardingProfilePayload,
  OnboardingProfileResponse,
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
