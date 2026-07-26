"use client";

import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { overviewKeys } from "@/modules/overview/client/keys";
import { getStoreSettingsRequest, saveStoreSettingsRequest } from "@/modules/settings/client/api";
import { settingsKeys } from "@/modules/settings/client/keys";

export function storeSettingsQueryOptions() {
  return queryOptions({
    queryKey: settingsKeys.detail(),
    queryFn: ({ signal }) => getStoreSettingsRequest(signal),
    staleTime: 30_000,
  });
}

export function useSaveStoreSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveStoreSettingsRequest,
    onSuccess: (result) => {
      if (!result.ok) return;
      queryClient.setQueryData(settingsKeys.detail(), result.value.settings);
      queryClient.invalidateQueries({ queryKey: overviewKeys.all });
    },
  });
}
