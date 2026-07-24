import type { ApiFieldErrors } from "@/lib/http/contracts";

export type ApiErrorOptions = {
  code: string;
  message: string;
  status: number;
  fieldErrors?: ApiFieldErrors;
  cause?: unknown;
};

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly fieldErrors?: ApiFieldErrors;

  constructor({ code, message, status, fieldErrors, cause }: ApiErrorOptions) {
    super(message, { cause });
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
