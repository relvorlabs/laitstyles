import { queryOptions } from "@tanstack/react-query";
import type { AdminRepositories } from "@/lib/admin/data/repositories";
import { settingsKeys } from "@/lib/admin/settings/settings-query-keys";

export function settingsQueryOptions(repositories: AdminRepositories) {
  return queryOptions({
    queryKey: settingsKeys.detail(),
    queryFn: () => repositories.settings.getSettings(),
  });
}
