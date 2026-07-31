import { apiRequest } from "@/lib/http/client";
import type {
  CheckoutContext,
  CheckoutDetail,
  CheckoutDraft,
  CreateCheckoutRequestInput,
  PaymentSettlement,
} from "@/modules/checkout/types";

const CHECKOUT_URL = "/api/v1/payments/checkout";

export async function getCheckoutContextRequest(signal?: AbortSignal): Promise<CheckoutContext> {
  const response = await apiRequest<CheckoutContext>(CHECKOUT_URL, { cache: "no-store", signal });
  return response.data;
}

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
