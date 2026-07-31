"use client";

import { queryOptions } from "@tanstack/react-query";
import { apiRequest } from "@/lib/http/client";

export type PaymentTimelineEvent = {
  id: string;
  kind: string;
  status: string | null;
  amountMinor: number;
  currency: string;
  occurredAt: string;
  actor: string | null;
  note: string | null;
  metadata: unknown;
};

export const paymentTimelineKeys = {
  all: ["admin", "payments", "timeline"] as const,
  detail: (paymentId: string) => [...paymentTimelineKeys.all, paymentId] as const,
};

export function paymentTimelineQueryOptions(paymentId: string) {
  return queryOptions({
    queryKey: paymentTimelineKeys.detail(paymentId),
    queryFn: async ({ signal }) =>
      (
        await apiRequest<PaymentTimelineEvent[]>(
          `/api/v1/admin/payments/${encodeURIComponent(paymentId)}/timeline`,
          { cache: "no-store", signal },
        )
      ).data,
    enabled: Boolean(paymentId.trim()),
    staleTime: 3_000,
  });
}
