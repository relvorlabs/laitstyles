import { queryOptions } from "@tanstack/react-query";
import type { AdminRepositories } from "@/lib/admin/data/repositories";
import { holdsKeys } from "@/lib/admin/holds/holds-query-keys";

export function holdsListQueryOptions(repositories: AdminRepositories) {
  return queryOptions({
    queryKey: holdsKeys.list(),
    queryFn: () => repositories.holds.listHolds(),
  });
}
