import { defaultOrderQuery } from "@/features/admin/orders/order-selectors";
import type { OrderQuery } from "@/features/admin/orders/order-types";

export function buildOrdersHref(
  pathname: string,
  {
    query,
    orderId,
  }: {
    query: OrderQuery;
    orderId: string | null;
  },
) {
  const params = new URLSearchParams();
  if (query.view !== defaultOrderQuery.view) params.set("view", query.view);
  if (query.search) params.set("q", query.search);
  if (query.channel !== defaultOrderQuery.channel) params.set("channel", query.channel);
  if (query.payment !== defaultOrderQuery.payment) params.set("payment", query.payment);
  if (query.sort !== defaultOrderQuery.sort) params.set("sort", query.sort);
  if (query.page !== defaultOrderQuery.page) params.set("page", String(query.page));
  if (query.pageSize !== defaultOrderQuery.pageSize) params.set("pageSize", String(query.pageSize));
  if (orderId) params.set("order", orderId);

  const suffix = params.toString();
  return suffix ? `${pathname}?${suffix}` : pathname;
}
