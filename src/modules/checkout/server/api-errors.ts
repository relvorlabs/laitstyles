import "server-only";

import { ApiError } from "@/lib/errors/api-error";
import type { CheckoutError } from "@/modules/checkout/types";

export function throwCheckoutApiError(error: CheckoutError): never {
  const status = checkoutErrorStatus(error.code);
  throw new ApiError({
    code: error.code,
    message: error.message,
    status,
    ...(error.field ? { fieldErrors: { [error.field]: error.message } } : {}),
  });
}

function checkoutErrorStatus(code: CheckoutError["code"]): number {
  switch (code) {
    case "CHECKOUT_INVALID":
    case "CHECKOUT_PRODUCT_UNAVAILABLE":
    case "CHECKOUT_VARIANT_INVALID":
      return 422;
    case "RESOURCE_NOT_OWNED":
    case "PAYMENT_NOT_FOUND":
      return 404;
    case "CHECKOUT_HOLD_EXPIRED":
    case "CHECKOUT_IDEMPOTENCY_CONFLICT":
    case "CHECKOUT_IN_PROGRESS":
    case "STOCK_NOT_AVAILABLE":
    case "PAYMENT_AMOUNT_MISMATCH":
    case "PAYMENT_CURRENCY_MISMATCH":
    case "PAYMENT_CUSTOMER_MISMATCH":
    case "PAYMENT_REFERENCE_MISMATCH":
      return 409;
    case "PAYMENT_INITIALIZATION_FAILED":
      return 502;
  }
}
