import type { ApiFieldErrors, ApiMeta, ApiSuccess } from "@/lib/http/contracts";
import { isApiFailure, isApiSuccess } from "@/lib/http/contracts";

export type ApiClientErrorOptions = {
  code: string;
  message: string;
  status: number;
  fieldErrors?: ApiFieldErrors;
  cause?: unknown;
};

export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly fieldErrors?: ApiFieldErrors;

  constructor({ code, message, status, fieldErrors, cause }: ApiClientErrorOptions) {
    super(message, { cause });
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export async function apiRequest<TData, TMeta extends ApiMeta = ApiMeta>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<ApiSuccess<TData, TMeta>> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");

  const response = await fetch(input, {
    ...init,
    headers,
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (cause) {
    throw new ApiClientError({
      code: "INVALID_API_RESPONSE",
      message: "The server returned an unreadable response.",
      status: response.status,
      cause,
    });
  }

  if (isApiFailure(payload)) {
    throw new ApiClientError({
      code: payload.error.code,
      message: payload.error.message,
      status: response.status,
      fieldErrors: payload.error.fieldErrors,
    });
  }

  if (!response.ok || !isApiSuccess(payload)) {
    throw new ApiClientError({
      code: "INVALID_API_RESPONSE",
      message: "The server returned an unexpected response.",
      status: response.status,
    });
  }

  return payload as ApiSuccess<TData, TMeta>;
}
