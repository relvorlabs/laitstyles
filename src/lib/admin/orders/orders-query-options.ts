import { queryOptions } from "@tanstack/react-query";
import type { AdminRepositories } from "@/lib/admin/data/repositories";
import { ordersKeys } from "@/lib/admin/orders/orders-query-keys";

export function ordersListQueryOptions(repositories: AdminRepositories) {
  return queryOptions({
    queryKey: ordersKeys.list(),
    queryFn: () => repositories.orders.listOrders(),
  });
}
