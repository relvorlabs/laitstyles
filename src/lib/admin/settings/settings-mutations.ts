"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdmin } from "@/features/admin/state/admin-provider";
import { settingsKeys } from "@/lib/admin/settings/settings-query-keys";
import type { SaveStoreSettingsInput } from "@/lib/admin/settings/settings-types";

export function useSaveStoreSettings() {
  const { saveStoreSettings } = useAdmin();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SaveStoreSettingsInput) => Promise.resolve(saveStoreSettings(input)),
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.setQueryData(settingsKeys.detail(), result.value.settings);
      }
    },
  });
}
