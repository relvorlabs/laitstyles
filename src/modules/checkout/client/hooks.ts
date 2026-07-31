"use client";

import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { ownedCartKeys } from "@/modules/cart/client/keys";
import {
  createCheckoutRequest,
  getCheckoutContextRequest,
  getCheckoutRequest,
  validateCheckoutCouponRequest,
  verifyCheckoutPaymentRequest,
} from "@/modules/checkout/client/http";
import { checkoutKeys } from "@/modules/checkout/client/keys";
import type { CheckoutContext, CheckoutDraft } from "@/modules/checkout/types";
import { accountCustomerKeys } from "@/modules/customers/client/account-keys";
import { accountOrderKeys } from "@/modules/orders/client/keys";

const accountSummaryKeys = ["account", "summary"] as const;

export function checkoutContextQueryOptions(enabled = true) {
  return queryOptions({
    queryKey: checkoutKeys.context(),
    queryFn: ({ signal }) => getCheckoutContextRequest(signal),
    enabled,
    staleTime: 15_000,
  });
}

export function checkoutCouponQueryOptions(
  code: string,
  subtotalMinor: number,
  enabled = true,
) {
  return queryOptions({
    queryKey: checkoutKeys.coupon(code, subtotalMinor),
    queryFn: ({ signal }) =>
      validateCheckoutCouponRequest({ code: code.trim(), subtotalMinor }, signal),
    enabled: enabled && code.trim().length >= 2,
    staleTime: 10_000,
    retry: false,
  });
}

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
      queryClient.setQueryData<CheckoutContext>(checkoutKeys.context(), (current) =>
        current ? { ...current, activeCheckout: checkout } : current,
      );
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
      queryClient.invalidateQueries({ queryKey: checkoutKeys.context() });
      queryClient.invalidateQueries({ queryKey: accountOrderKeys.all });
      queryClient.invalidateQueries({ queryKey: accountSummaryKeys });
      queryClient.invalidateQueries({ queryKey: accountCustomerKeys.addresses() });
      if (settlement.status === "success") {
        queryClient.invalidateQueries({ queryKey: ownedCartKeys.all });
      }
    },
  });
}
