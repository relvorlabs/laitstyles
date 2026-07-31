import "server-only";

import { ApiError } from "@/lib/errors/api-error";
import type { PaymentMethodError } from "@/modules/payments/types";

export function throwPaymentMethodApiError(error: PaymentMethodError): never {
  throw new ApiError({
    code: error.code,
    message: error.message,
    status: statusFor(error.code),
    ...(error.field ? { fieldErrors: { [error.field]: error.message } } : {}),
  });
}

function statusFor(code: PaymentMethodError["code"]) {
  switch (code) {
    case "PAYMENT_METHOD_INVALID":
      return 422;
    case "PAYMENT_METHOD_NOT_FOUND":
    case "PAYMENT_METHOD_SETUP_NOT_FOUND":
      return 404;
    case "PAYMENT_METHOD_SETUP_PENDING":
    case "PAYMENT_METHOD_NOT_REUSABLE":
    case "PAYMENT_METHOD_CUSTOMER_MISMATCH":
    case "PAYMENT_METHOD_AMOUNT_MISMATCH":
    case "PAYMENT_METHOD_CURRENCY_MISMATCH":
      return 409;
    case "PAYMENT_METHOD_SETUP_FAILED":
    case "PAYMENT_METHOD_PROVIDER_UNAVAILABLE":
      return 502;
  }
}
