import { err, ok, type Result } from "@/lib/errors";
import { apiRequest, ApiClientError } from "@/lib/http/client";
import type {
  AdminOrderListResult,
  ControlRoomOrder,
  OfflineSaleInput,
  OfflineSaleSuccess,
  OrderListInput,
  OrderStatus,
  OrderTransitionSuccess,
  SalesActionError,
  SalesActionErrorCode,
} from "@/modules/orders/types";

const ORDERS_URL = "/api/v1/admin/orders";
const OFFLINE_SALES_URL = `${ORDERS_URL}/offline-sales`;
const salesActionErrorCodes = new Set<string>([
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
]);

export async function listAdminOrdersRequest(
  input: OrderListInput,
  signal?: AbortSignal,
): Promise<AdminOrderListResult> {
  const params = new URLSearchParams({
    view: input.view,
    search: input.search,
    channel: input.channel,
    payment: input.payment,
    sort: input.sort,
    page: String(input.page),
    pageSize: String(input.pageSize),
  });
  const response = await apiRequest<ControlRoomOrder[], AdminOrderListResult["meta"]>(
    `${ORDERS_URL}?${params.toString()}`,
    { cache: "no-store", signal },
  );
  if (!response.meta) {
    throw new ApiClientError({
      code: "INVALID_API_RESPONSE",
      message: "The orders response did not include pagination metadata.",
      status: 200,
    });
  }
  return { data: response.data, meta: response.meta };
}

export async function getAdminOrderRequest(
  orderId: string,
  signal?: AbortSignal,
): Promise<ControlRoomOrder | null> {
  try {
    const response = await apiRequest<ControlRoomOrder>(
      `${ORDERS_URL}/${encodeURIComponent(orderId)}`,
      { cache: "no-store", signal },
    );
    return response.data;
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) return null;
    throw error;
  }
}

export async function transitionOrderRequest({
  orderId,
  nextStatus,
}: {
  orderId: string;
  nextStatus: OrderStatus;
}): Promise<Result<OrderTransitionSuccess, SalesActionError>> {
  try {
    const response = await apiRequest<OrderTransitionSuccess>(
      `${ORDERS_URL}/${encodeURIComponent(orderId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nextStatus }),
      },
    );
    return ok(response.data);
  } catch (error) {
    if (error instanceof ApiClientError) return err(toSalesActionError(error));
    throw error;
  }
}

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
  const field = error.fieldErrors ? Object.keys(error.fieldErrors)[0] : undefined;
  return {
    code: isSalesActionErrorCode(code) ? code : "paystack-initialization-failed",
    message: error.message,
    ...(field ? { field } : {}),
  };
}

function isSalesActionErrorCode(value: string): value is SalesActionErrorCode {
  return salesActionErrorCodes.has(value);
}
