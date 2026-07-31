"use client";

import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { apiRequest } from "@/lib/http/client";
import type { AdminPaymentRecord } from "@/modules/payments/client/refunds";

const URL = "/api/v1/admin/payments";

export type AdminPaymentListFilters = {
  page?: number;
  perPage?: number;
  status?: string;
  orderId?: string;
  reference?: string;
};

export const adminPaymentListKeys = {
  all: ["admin", "payments"] as const,
  list: (filters: AdminPaymentListFilters = {}) =>
    [...adminPaymentListKeys.all, "list", filters] as const,
};

export function adminPaymentsQueryOptions(filters: AdminPaymentListFilters = {}) {
  return queryOptions({
    queryKey: adminPaymentListKeys.list(filters),
    queryFn: async ({ signal }) =>
      (
        await apiRequest<AdminPaymentRecord[]>(withQuery(URL, filters), {
          cache: "no-store",
          signal,
        })
      ).data,
    placeholderData: keepPreviousData,
    staleTime: 5_000,
  });
}

function withQuery(path: string, values: Record<string, unknown>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}
