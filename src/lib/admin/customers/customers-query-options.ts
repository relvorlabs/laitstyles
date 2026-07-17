import { queryOptions } from "@tanstack/react-query";
import { customersKeys } from "@/lib/admin/customers/customers-query-keys";
import type { AdminRepositories } from "@/lib/admin/data/repositories";

export function customersListQueryOptions(repositories: AdminRepositories) {
  return queryOptions({
    queryKey: customersKeys.list(),
    queryFn: () => repositories.customers.listCustomers(),
  });
}
