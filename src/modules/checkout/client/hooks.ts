"use client";

import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createCheckoutRequest,
  getCheckoutRequest,
  verifyCheckoutPaymentRequest,
} from "@/modules/checkout/client/http";
import { checkoutKeys } from "@/modules/checkout/client/keys";
import { accountOrderKeys } from "@/modules/orders/client/keys";

const storefrontCartKeys = ["storefront", "cart"] as const;
const accountSummaryKeys = ["account", "summary"] as const;

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
      queryClient.setQueryData(checkoutKeys.payment(checkout.paymentId), checkout);
    },
  });
}

export function useVerifyCheckoutPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: verifyCheckoutPaymentRequest,
    onSuccess: (settlement) => {
      queryClient.setQueryData(checkoutKeys.payment(settlement.paymentId), settlement);
      queryClient.invalidateQueries({ queryKey: checkoutKeys.detail(settlement.checkoutId) });
      queryClient.invalidateQueries({ queryKey: accountOrderKeys.all });
      queryClient.invalidateQueries({ queryKey: accountSummaryKeys });
      if (settlement.status === "success") {
        queryClient.invalidateQueries({ queryKey: storefrontCartKeys });
      }
    },
  });
}
