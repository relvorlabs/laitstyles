"use client";

import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  cancelAccountDeletionRequest,
  getAccountDeletionRequestRequest,
  getAccountExportRequest,
  listAccountExportsRequest,
  requestAccountDeletionRequest,
  requestAccountExportRequest,
} from "@/modules/account-lifecycle/client/api";
import { accountLifecycleKeys } from "@/modules/account-lifecycle/client/keys";

export function accountExportsQueryOptions() {
  return queryOptions({
    queryKey: accountLifecycleKeys.exports.all,
    queryFn: ({ signal }) => listAccountExportsRequest(signal),
    staleTime: 10_000,
  });
}

export function accountExportQueryOptions(exportId: string) {
  return queryOptions({
    queryKey: accountLifecycleKeys.exports.detail(exportId),
    queryFn: ({ signal }) => getAccountExportRequest(exportId, signal),
    enabled: Boolean(exportId.trim()),
    staleTime: 10_000,
  });
}

export function accountDeletionRequestQueryOptions() {
  return queryOptions({
    queryKey: accountLifecycleKeys.deletion.all,
    queryFn: ({ signal }) => getAccountDeletionRequestRequest(signal),
    staleTime: 10_000,
  });
}

export function useRequestAccountExport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: requestAccountExportRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountLifecycleKeys.exports.all });
    },
  });
}

export function useRequestAccountDeletion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: requestAccountDeletionRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountLifecycleKeys.deletion.all });
    },
  });
}

export function useCancelAccountDeletion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelAccountDeletionRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountLifecycleKeys.deletion.all });
    },
  });
}
