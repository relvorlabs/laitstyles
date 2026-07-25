import { err, ok, type Result } from "@/lib/errors";
import { apiRequest, ApiClientError } from "@/lib/http/client";
import type {
  OfflineSaleInput,
  OfflineSaleSuccess,
  SalesActionError,
  SalesActionErrorCode,
} from "@/modules/orders/types";

const OFFLINE_SALES_URL = "/api/v1/admin/orders/offline-sales";

export async function recordOfflineSaleRequest(
  input: OfflineSaleInput,
): Promise<Result<OfflineSaleSuccess, SalesActionError>> {
  try {
    const response = await apiRequest<OfflineSaleSuccess>(OFFLINE_SALES_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return ok(response.data);
  } catch (error) {
    if (error instanceof ApiClientError) return err(toSalesActionError(error));
    throw error;
  }
}

function toSalesActionError(error: ApiClientError): SalesActionError {
  const code = error.code.toLocaleLowerCase("en-GB").replaceAll("_", "-");
  return {
    code: isSalesActionErrorCode(code) ? code : "paystack-initialization-failed",
    message: error.message,
    field: error.fieldErrors ? Object.keys(error.fieldErrors)[0] : undefined,
  };
}

function isSalesActionErrorCode(value: string): value is SalesActionErrorCode {
  return new Set<string>([
    "invalid-quantity",
    "invalid-price",
    "empty-sale",
    "product-not-found",
    "variant-required",
    "variant-not-found",
    "variant-not-allowed",
    "insufficient-available-stock",
    "insufficient-reserved-stock",
    "insufficient-committed-stock",
    "order-not-found",
    "invalid-order-transition",
    "customer-not-found",
    "customer-email-required",
    "invalid-payment-state",
    "paystack-not-configured",
    "paystack-initialization-failed",
  ]).has(value);
}
