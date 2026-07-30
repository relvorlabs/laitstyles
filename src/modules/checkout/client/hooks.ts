"use client";

import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createCheckoutRequest,
  getCheckoutRequest,
  verifyCheckoutPaymentRequest,
} from "@/modules/checkout/client/http";
import { checkoutKeys } from "@/modules/checkout/client/keys";
import type { CheckoutDraft, CheckoutStatus } from "@/modules/checkout/types";
import { accountOrderKeys } from "@/modules/orders/client/keys";

const storefrontCartKeys = ["storefront", "cart"] as const;
const accountSummaryKeys = ["account", "summary"] as const;
const recoveryStatuses = new Set<CheckoutStatus>([
  "failed",
  "abandoned",
  "reversed",
  "review_required",
]);

export function checkoutQueryOptions(checkoutId: string) {
  return queryOptions({
    queryKey: checkoutKeys.detail(checkoutId),
    queryFn: ({ signal }) => getCheckoutRequest(checkoutId, signal),
    enabled: Boolean(checkoutId.trim()),
    staleTime: 2_000,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "initializing" || status === "initialized" || status === "pending"
        ? 2_000
        : false;
    },
  });
}

export function useCreateCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCheckoutRequest,
    onSuccess: (checkout) => {
      queryClient.setQueryData(checkoutKeys.detail(checkout.checkoutId), checkout);
      queryClient.setQueryData(checkoutKeys.payment(checkout.paymentId), checkout);
      persistCheckoutLocation(checkout.checkoutId, false);
    },
  });
}

export function useVerifyCheckoutPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: verifyCheckoutPaymentRequest,
    onSuccess: (settlement) => {
      queryClient.setQueryData(checkoutKeys.payment(settlement.paymentId), settlement);
      queryClient.setQueryData<CheckoutDraft>(
        checkoutKeys.detail(settlement.checkoutId),
        (current) => (current ? { ...current, status: settlement.status } : current),
      );
      queryClient.invalidateQueries({ queryKey: checkoutKeys.detail(settlement.checkoutId) });
      queryClient.invalidateQueries({ queryKey: accountOrderKeys.all });
      queryClient.invalidateQueries({ queryKey: accountSummaryKeys });
      if (settlement.status === "success") {
        queryClient.invalidateQueries({ queryKey: storefrontCartKeys });
      } else if (recoveryStatuses.has(settlement.status)) {
        persistCheckoutLocation(settlement.checkoutId, true);
      }
    },
    onError: () => {
      const checkoutId = currentCheckoutId();
      if (checkoutId) persistCheckoutLocation(checkoutId, true);
    },
  });
}

function currentCheckoutId() {
  if (typeof window === "undefined") return null;
  return new URL(window.location.href).searchParams.get("checkout")?.trim() || null;
}

function persistCheckoutLocation(checkoutId: string, recovery: boolean) {
  if (typeof window === "undefined" || window.location.pathname !== "/checkout") return;
  const url = new URL(window.location.href);
  url.searchParams.set("checkout", checkoutId);
  if (recovery) url.searchParams.set("recovery", "1");
  else url.searchParams.delete("recovery");
  const next = `${url.pathname}${url.search}${url.hash}`;

  if (recovery) {
    if (window.location.search === url.search) return;
    window.location.replace(next);
    return;
  }
  window.history.replaceState(window.history.state, "", next);
}
