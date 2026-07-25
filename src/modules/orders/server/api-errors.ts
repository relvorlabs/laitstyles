import "server-only";

import { ApiError } from "@/lib/errors/api-error";
import type { SalesActionError } from "@/modules/orders/types";

export function throwOrderActionError(error: SalesActionError): never {
  throw new ApiError({
    code: apiCode(error.code),
    message: error.message,
    status: apiStatus(error.code),
    ...(error.field ? { fieldErrors: { [error.field]: error.message } } : {}),
  });
}

function apiCode(code: SalesActionError["code"]) {
  return code.replaceAll("-", "_").toUpperCase();
}

function apiStatus(code: SalesActionError["code"]) {
  switch (code) {
    case "order-not-found":
    case "customer-not-found":
    case "product-not-found":
    case "variant-not-found":
      return 404;
    case "insufficient-available-stock":
    case "insufficient-reserved-stock":
    case "insufficient-committed-stock":
    case "invalid-order-transition":
    case "invalid-payment-state":
      return 409;
    case "paystack-not-configured":
      return 503;
    case "paystack-initialization-failed":
      return 502;
    default:
      return 422;
  }
}
