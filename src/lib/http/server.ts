import "server-only";

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ApiError, isApiError } from "@/lib/errors/api-error";
import type {
  ApiFailure,
  ApiFieldErrors,
  ApiMeta,
  ApiSuccess,
} from "@/lib/http/contracts";
import { logger } from "@/lib/logger";

export type ApiRouteResult<TData, TMeta extends ApiMeta = ApiMeta> = {
  data: TData;
  meta?: TMeta;
  status?: number;
  headers?: HeadersInit;
};

export async function handleApiRequest<TData, TMeta extends ApiMeta = ApiMeta>(
  operation: () => ApiRouteResult<TData, TMeta> | Promise<ApiRouteResult<TData, TMeta>>,
) {
  try {
    const result = await operation();
    return apiSuccess(result.data, {
      headers: result.headers,
      meta: result.meta,
      status: result.status,
    });
  } catch (error) {
    return apiFailure(mapApiError(error));
  }
}

export function apiSuccess<TData, TMeta extends ApiMeta = ApiMeta>(
  data: TData,
  options: {
    meta?: TMeta;
    status?: number;
    headers?: HeadersInit;
  } = {},
): NextResponse<ApiSuccess<TData, TMeta>> {
  const meta = (options.meta ?? {}) as TMeta;

  return NextResponse.json(
    { data, meta },
    {
      status: options.status ?? 200,
      headers: options.headers,
    },
  );
}

export function apiFailure(error: ApiError): NextResponse<ApiFailure> {
  const payload: ApiFailure = {
    error: {
      code: error.code,
      message: error.message,
      ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
    },
  };

  return NextResponse.json(payload, { status: error.status });
}

export function mapApiError(error: unknown): ApiError {
  if (isApiError(error)) return error;

  if (error instanceof ZodError) {
    return new ApiError({
      code: "VALIDATION_ERROR",
      message: "The request contains invalid fields.",
      status: 422,
      fieldErrors: toFieldErrors(error),
      cause: error,
    });
  }

  logger.error(
    {
      errorName: error instanceof Error ? error.name : typeof error,
    },
    "Unhandled API route failure",
  );

  return new ApiError({
    code: "INTERNAL_ERROR",
    message: "The request could not be completed.",
    status: 500,
    cause: error,
  });
}

function toFieldErrors(error: ZodError): ApiFieldErrors {
  return Object.fromEntries(
    Object.entries(error.flatten().fieldErrors).filter(
      (entry): entry is [string, string[]] => Array.isArray(entry[1]) && entry[1].length > 0,
    ),
  );
}
