import { err, ok, type Result } from "@/lib/errors";
import { apiRequest, ApiClientError } from "@/lib/http/client";
import type {
  AdminHoldListResult,
  ControlRoomHold,
  ConvertHoldInput,
  HoldActionError,
  HoldActionErrorCode,
  HoldActionSuccess,
  HoldListInput,
} from "@/modules/holds/types";

const HOLDS_URL = "/api/v1/admin/holds";
const holdActionErrorCodes = new Set<string>([
  "hold-not-found",
  "hold-inactive",
  "invalid-hold-extension",
  "stock-write-conflict",
  "insufficient-reserved-stock",
]);

export async function listAdminHoldsRequest(
  input: HoldListInput,
  signal?: AbortSignal,
): Promise<AdminHoldListResult> {
  const params = new URLSearchParams({
    view: input.view,
    search: input.search,
    source: input.source,
    stage: input.stage,
    sort: input.sort,
    page: String(input.page),
    pageSize: String(input.pageSize),
  });
  const response = await apiRequest<ControlRoomHold[], AdminHoldListResult["meta"]>(
    `${HOLDS_URL}?${params.toString()}`,
    { cache: "no-store", signal },
  );
  if (!response.meta) {
    throw new ApiClientError({
      code: "INVALID_API_RESPONSE",
      message: "The holds response did not include pagination metadata.",
      status: 200,
    });
  }
  return { data: response.data, meta: response.meta };
}

export async function getAdminHoldRequest(holdId: string, signal?: AbortSignal) {
  try {
    const response = await apiRequest<ControlRoomHold>(
      `${HOLDS_URL}/${encodeURIComponent(holdId)}`,
      { cache: "no-store", signal },
    );
    return response.data;
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) return null;
    throw error;
  }
}

export function extendHoldRequest({ holdId, minutes }: { holdId: string; minutes: number }) {
  return holdMutationRequest(`${HOLDS_URL}/${encodeURIComponent(holdId)}/extend`, { minutes });
}

export function releaseHoldRequest(holdId: string) {
  return holdMutationRequest(`${HOLDS_URL}/${encodeURIComponent(holdId)}/release`, {});
}

export function convertHoldRequest({
  holdId,
  ...input
}: ConvertHoldInput & { holdId: string }) {
  return holdMutationRequest(`${HOLDS_URL}/${encodeURIComponent(holdId)}/convert`, input);
}

async function holdMutationRequest(
  url: string,
  body: object,
): Promise<Result<HoldActionSuccess, HoldActionError>> {
  try {
    const response = await apiRequest<HoldActionSuccess>(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return ok(response.data);
  } catch (error) {
    if (error instanceof ApiClientError) return err(toHoldActionError(error));
    throw error;
  }
}

function toHoldActionError(error: ApiClientError): HoldActionError {
  const code = error.code.toLocaleLowerCase("en-GB").replaceAll("_", "-");
  const available = parseOptionalNumber(error.fieldErrors?.available);
  const requested = parseOptionalNumber(error.fieldErrors?.requested);
  return {
    code: isHoldActionErrorCode(code) ? code : "hold-inactive",
    message: error.message,
    ...(available === undefined ? {} : { available }),
    ...(requested === undefined ? {} : { requested }),
  };
}

function parseOptionalNumber(value: string | undefined) {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function isHoldActionErrorCode(value: string): value is HoldActionErrorCode {
  return holdActionErrorCodes.has(value);
}
