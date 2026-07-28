import "server-only";

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ApiError, isApiError } from "@/lib/errors/api-error";
import type { ApiFailure, ApiFieldErrors, ApiMeta, ApiSuccess } from "@/lib/http/contracts";
import {
  type ApiRequestContext,
  createApiRequestContext,
  withRequestId,
} from "@/lib/http/request-context";
import { logger } from "@/lib/logger";

export type ApiRouteResult<TData, TMeta extends ApiMeta = ApiMeta> = {
  data: TData;
  meta?: TMeta;
  status?: number;
  headers?: HeadersInit;
};

type ApiOperation<TData, TMeta extends ApiMeta> = (
  context: ApiRequestContext,
) => ApiRouteResult<TData, TMeta> | Promise<ApiRouteResult<TData, TMeta>>;

type RawApiOperation<TData> = (
  context: ApiRequestContext,
) => ApiRouteResult<TData> | Promise<ApiRouteResult<TData>>;

export function handleApiRequest<TData, TMeta extends ApiMeta = ApiMeta>(
  operation: ApiOperation<TData, TMeta>,
): Promise<NextResponse<ApiSuccess<TData, TMeta> | ApiFailure>>;
export function handleApiRequest<TData, TMeta extends ApiMeta = ApiMeta>(
  request: Request,
  operation: ApiOperation<TData, TMeta>,
): Promise<NextResponse<ApiSuccess<TData, TMeta> | ApiFailure>>;
export async function handleApiRequest<TData, TMeta extends ApiMeta = ApiMeta>(
  requestOrOperation: Request | ApiOperation<TData, TMeta>,
  maybeOperation?: ApiOperation<TData, TMeta>,
): Promise<NextResponse<ApiSuccess<TData, TMeta> | ApiFailure>> {
  const request = typeof requestOrOperation === "function" ? undefined : requestOrOperation;
  const operation = typeof requestOrOperation === "function" ? requestOrOperation : maybeOperation;

  if (!operation) {
    throw new TypeError("handleApiRequest requires an API operation.");
  }

  const context = createApiRequestContext(request);

  try {
    const result = await operation(context);
    return apiSuccess(result.data, {
      headers: withRequestId(result.headers, context.requestId),
      meta: result.meta,
      status: result.status,
    });
  } catch (error) {
    return apiFailure(mapApiError(error, context), {
      headers: withRequestId(undefined, context.requestId),
    });
  }
}

export async function handleApiRequestRaw<TData>(
  request: Request,
  operation: RawApiOperation<TData>,
): Promise<NextResponse<TData | ApiFailure>> {
  const context = createApiRequestContext(request);

  try {
    const result = await operation(context);
    return NextResponse.json(result.data, {
      status: result.status ?? 200,
      headers: withRequestId(result.headers, context.requestId),
    });
  } catch (error) {
    return apiFailure(mapApiError(error, context), {
      headers: withRequestId(undefined, context.requestId),
    });
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
  const payload: ApiSuccess<TData, TMeta> = {
    data,
    ...(options.meta === undefined ? {} : { meta: options.meta }),
  };

  return NextResponse.json(payload, {
    status: options.status ?? 200,
    headers: options.headers,
  });
}

export function apiFailure(
  error: ApiError,
  options: { headers?: HeadersInit } = {},
): NextResponse<ApiFailure> {
  const payload: ApiFailure = {
    error: {
      code: error.code,
      message: error.message,
      ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
    },
  };

  return NextResponse.json(payload, {
    status: error.status,
    headers: options.headers,
  });
}

export function mapApiError(error: unknown, context?: ApiRequestContext): ApiError {
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
      requestId: context?.requestId ?? null,
      method: context?.method ?? null,
      pathname: context?.pathname ?? null,
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
    Object.entries(error.flatten().fieldErrors).flatMap(([field, messages]) => {
      const firstMessage = Array.isArray(messages) ? messages[0] : undefined;
      return typeof firstMessage === "string" ? [[field, firstMessage]] : [];
    }),
  );
}
