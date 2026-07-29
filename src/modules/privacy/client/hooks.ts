"use client";

import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPrivacyPreferencesRequest,
  updatePrivacyPreferencesRequest,
} from "@/modules/privacy/client/api";
import { privacyKeys } from "@/modules/privacy/client/keys";

export function privacyPreferencesQueryOptions() {
  return queryOptions({
    queryKey: privacyKeys.all,
    queryFn: ({ signal }) => getPrivacyPreferencesRequest(signal),
    staleTime: 30_000,
  });
}

export function useUpdatePrivacyPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updatePrivacyPreferencesRequest,
    onSuccess: (preferences) => {
      queryClient.setQueryData(privacyKeys.all, preferences);
    },
  });
}
