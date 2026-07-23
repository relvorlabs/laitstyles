import { queryOptions } from "@tanstack/react-query";
import type { AdminRepositories } from "@/lib/admin/data/repositories";
import { returnsKeys } from "@/lib/admin/returns/returns-query-keys";

export function returnsListQueryOptions(repositories: AdminRepositories) {
  return queryOptions({
    queryKey: returnsKeys.list(),
    queryFn: () => repositories.returns.listReturns(),
  });
}
