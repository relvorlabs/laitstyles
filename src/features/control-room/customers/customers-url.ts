import type { CustomerQuery } from "@/features/control-room/customers/customer-types";
import { defaultCustomerQuery } from "@/features/control-room/customers/customer-selectors";

export function buildCustomersHref(
  pathname: string,
  {
    query,
    customerId,
  }: {
    query: CustomerQuery;
    customerId: string | null;
  },
) {
  const params = new URLSearchParams();

  if (query.view !== defaultCustomerQuery.view) params.set("view", query.view);
  if (query.search.trim()) params.set("q", query.search.trim());
  if (query.type !== defaultCustomerQuery.type) params.set("type", query.type);
  if (query.sort !== defaultCustomerQuery.sort) params.set("sort", query.sort);
  if (customerId) params.set("customer", customerId);

  const search = params.toString();
  return search ? `${pathname}?${search}` : pathname;
}