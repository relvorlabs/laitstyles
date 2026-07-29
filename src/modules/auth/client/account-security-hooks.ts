"use client";

import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  changeAccountPasswordRequest,
  createMfaChallengeRequest,
  enrollTotpRequest,
  getAccountSessionsRequest,
  listMfaFactorsRequest,
  removeMfaFactorRequest,
  requestAccountEmailChangeRequest,
  signOutOtherSessionsRequest,
  verifyMfaChallengeRequest,
} from "@/modules/auth/client/account-security-api";
import { accountSecurityKeys } from "@/modules/auth/client/account-security-keys";

export function accountSecurityFactorsQueryOptions() {
  return queryOptions({
    queryKey: accountSecurityKeys.factors(),
    queryFn: ({ signal }) => listMfaFactorsRequest(signal),
    staleTime: 15_000,
  });
}

export function accountSecuritySessionsQueryOptions() {
  return queryOptions({
    queryKey: accountSecurityKeys.sessions(),
    queryFn: ({ signal }) => getAccountSessionsRequest(signal),
    staleTime: 15_000,
  });
}

export function useAccountSecurityFactors() {
  return useQuery(accountSecurityFactorsQueryOptions());
}

export function useAccountSecuritySessions() {
  return useQuery(accountSecuritySessionsQueryOptions());
}

export function useRequestAccountEmailChange() {
  return useMutation({ mutationFn: requestAccountEmailChangeRequest });
}

export function useChangeAccountPassword() {
  return useMutation({ mutationFn: changeAccountPasswordRequest });
}

export function useEnrollTotp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: enrollTotpRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountSecurityKeys.factors() });
    },
  });
}

export function useCreateMfaChallenge() {
  return useMutation({ mutationFn: createMfaChallengeRequest });
}

export function useVerifyMfaChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: verifyMfaChallengeRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountSecurityKeys.factors() });
      queryClient.invalidateQueries({ queryKey: accountSecurityKeys.sessions() });
    },
  });
}

export function useRemoveMfaFactor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeMfaFactorRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountSecurityKeys.factors() });
      queryClient.invalidateQueries({ queryKey: accountSecurityKeys.sessions() });
    },
  });
}

export function useSignOutOtherSessions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: signOutOtherSessionsRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountSecurityKeys.sessions() });
    },
  });
}
