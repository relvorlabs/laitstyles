import { err, ok, type Result } from "@/lib/errors";
import { apiRequest, ApiClientError } from "@/lib/http/client";
import type {
  AdminReturnListResult,
  ControlRoomReturn,
  CreateReturnInput,
  EligibleReturnOrder,
  ReturnActionError,
  ReturnActionErrorCode,
  ReturnActionSuccess,
  ReturnListInput,
  ReturnStatus,
} from "@/modules/returns/types";

const RETURNS_URL = "/api/v1/admin/returns";
const returnActionErrorCodes = new Set<string>([
  "order-not-found",
  "return-not-found",
  "return-line-not-found",
  "return-line-not-sold",
  "return-quantity-exceeded",
  "invalid-quantity",
  "invalid-return-transition",
  "insufficient-sold-stock",
  "insufficient-returned-stock",
  "stock-write-conflict",
]);

export async function listAdminReturnsRequest(
  input: ReturnListInput,
  signal?: AbortSignal,
): Promise<AdminReturnListResult> {
  const params = new URLSearchParams({
    view: input.view,
    search: input.search,
    status: input.status,
    sort: input.sort,
    page: String(input.page),
    pageSize: String(input.pageSize),
  });
  const response = await apiRequest<ControlRoomReturn[], AdminReturnListResult["meta"]>(
    `${RETURNS_URL}?${params.toString()}`,
    { cache: "no-store", signal },
  );
  if (!response.meta) {
    throw new ApiClientError({
      code: "INVALID_API_RESPONSE",
      message: "The returns response did not include pagination metadata.",
      status: 200,
    });
  }
  return { data: response.data, meta: response.meta };
}

export async function getAdminReturnRequest(returnId: string, signal?: AbortSignal) {
  try {
    const response = await apiRequest<ControlRoomReturn>(
      `${RETURNS_URL}/${encodeURIComponent(returnId)}`,
      { cache: "no-store", signal },
    );
    return response.data;
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) return null;
    throw error;
  }
}

export async function listEligibleReturnOrdersRequest(signal?: AbortSignal) {
  const response = await apiRequest<EligibleReturnOrder[]>(`${RETURNS_URL}/eligible-orders`, {
    cache: "no-store",
    signal,
  });
  return response.data;
}

export async function createReturnRequest(
  input: CreateReturnInput,
): Promise<Result<ReturnActionSuccess, ReturnActionError>> {
  try {
    const response = await apiRequest<ReturnActionSuccess>(RETURNS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return ok(response.data);
  } catch (error) {
    if (error instanceof ApiClientError) return err(toReturnActionError(error));
    throw error;
  }
}

export async function transitionReturnRequest({
  returnId,
  nextStatus,
}: {
  returnId: string;
  nextStatus: ReturnStatus;
}): Promise<Result<ReturnActionSuccess, ReturnActionError>> {
  try {
    const response = await apiRequest<ReturnActionSuccess>(
      `${RETURNS_URL}/${encodeURIComponent(returnId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nextStatus }),
      },
    );
    return ok(response.data);
  } catch (error) {
    if (error instanceof ApiClientError) return err(toReturnActionError(error));
    throw error;
  }
}

function toReturnActionError(error: ApiClientError): ReturnActionError {
  const code = error.code.toLocaleLowerCase("en-GB").replaceAll("_", "-");
  const fieldErrors = error.fieldErrors ?? {};
  const field = Object.keys(fieldErrors).find((key) => !["available", "requested"].includes(key));
  const available = parseOptionalNumber(fieldErrors.available);
  const requested = parseOptionalNumber(fieldErrors.requested);
  return {
    code: isReturnActionErrorCode(code) ? code : "invalid-return-transition",
    message: error.message,
    ...(field ? { field } : {}),
    ...(available === undefined ? {} : { available }),
    ...(requested === undefined ? {} : { requested }),
  };
}

function parseOptionalNumber(value: string | undefined) {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function isReturnActionErrorCode(value: string): value is ReturnActionErrorCode {
  return returnActionErrorCodes.has(value);
}
