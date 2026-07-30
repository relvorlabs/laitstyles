import { apiRequest } from "@/lib/http/client";
import type {
  CheckoutDetail,
  CheckoutDraft,
  CheckoutStatus,
  CreateCheckoutRequestInput,
  PaymentSettlement,
} from "@/modules/checkout/types";

const CHECKOUT_URL = "/api/v1/checkout";
const recoveryStatuses = new Set<CheckoutStatus>([
  "failed",
  "abandoned",
  "reversed",
  "review_required",
]);

export async function createCheckoutRequest(
  input: CreateCheckoutRequestInput,
): Promise<CheckoutDraft> {
  const response = await apiRequest<CheckoutDraft>(CHECKOUT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return response.data;
}

export async function getCheckoutRequest(
  checkoutId: string,
  signal?: AbortSignal,
): Promise<CheckoutDetail> {
  const response = await apiRequest<CheckoutDetail>(
    `${CHECKOUT_URL}/${encodeURIComponent(checkoutId)}`,
    { cache: "no-store", signal },
  );
  enterRecoveryForTerminalCheckout(response.data);
  return response.data;
}

export async function verifyCheckoutPaymentRequest(
  paymentId: string,
): Promise<PaymentSettlement> {
  const response = await apiRequest<PaymentSettlement>(
    `/api/v1/payments/${encodeURIComponent(paymentId)}/verify`,
    { method: "POST" },
  );
  return response.data;
}

function enterRecoveryForTerminalCheckout(checkout: CheckoutDetail) {
  if (
    typeof window === "undefined" ||
    window.location.pathname !== "/checkout" ||
    !recoveryStatuses.has(checkout.status)
  ) {
    return;
  }
  const url = new URL(window.location.href);
  if (url.searchParams.get("recovery") === "1") return;
  url.searchParams.set("checkout", checkout.checkoutId);
  url.searchParams.set("recovery", "1");
  window.location.replace(`${url.pathname}${url.search}${url.hash}`);
}
