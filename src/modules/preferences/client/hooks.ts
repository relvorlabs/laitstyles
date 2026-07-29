"use client";

import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCustomerPreferencesRequest,
  updateCustomerPreferencesRequest,
} from "@/modules/preferences/client/api";
import { preferencesKeys } from "@/modules/preferences/client/keys";

export function customerPreferencesQueryOptions() {
  return queryOptions({
    queryKey: preferencesKeys.all,
    queryFn: ({ signal }) => getCustomerPreferencesRequest(signal),
    staleTime: 30_000,
  });
}

export function useUpdateCustomerPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateCustomerPreferencesRequest,
    onSuccess: (preferences) => {
      queryClient.setQueryData(preferencesKeys.all, preferences);
    },
  });
}
