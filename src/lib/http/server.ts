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

type DatabaseFailure = {
  code: "DATABASE_SCHEMA_NOT_READY" | "DATABASE_UNAVAILABLE";
  message: string;
  errorCode: string | null;
  databaseCode: string | null;
};

const schemaPrismaCodes = new Set(["P2021", "P2022"]);
const connectionPrismaCodes = new Set([
  "P1000",
  "P1001",
  "P1002",
  "P1003",
  "P1008",
  "P1011",
  "P1017",
  "P2024",
]);
const schemaDatabaseCodes = new Set(["42P01", "42703"]);
const connectionDatabaseCodes = new Set([
  "08000",
  "08001",
  "08003",
  "08004",
  "08006",
  "08007",
  "08P01",
  "53300",
  "57P01",
  "57P02",
  "57P03",
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
]);

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

  const databaseFailure = classifyDatabaseFailure(error);
  const diagnosticContext = {
    requestId: context?.requestId ?? null,
    method: context?.method ?? null,
    pathname: context?.pathname ?? null,
    errorName: error instanceof Error ? error.name : typeof error,
  };

  if (databaseFailure) {
    logger.error(
      {
        ...diagnosticContext,
        errorCode: databaseFailure.errorCode,
        databaseCode: databaseFailure.databaseCode,
      },
      "Database request failed",
    );
    return new ApiError({
      code: databaseFailure.code,
      message: databaseFailure.message,
      status: 503,
      cause: error,
    });
  }

  logger.error(diagnosticContext, "Unhandled API route failure");

  return new ApiError({
    code: "INTERNAL_ERROR",
    message: "The request could not be completed.",
    status: 500,
    cause: error,
  });
}

function classifyDatabaseFailure(error: unknown): DatabaseFailure | null {
  const record = asRecord(error);
  if (!record) return null;

  const meta = asRecord(record.meta);
  const errorCode = readString(record.code) ?? readString(record.errorCode);
  const nestedDatabaseCode =
    readString(meta?.code) ?? readString(meta?.databaseCode) ?? readString(record.errno);
  const databaseCode =
    nestedDatabaseCode ??
    (errorCode !== null &&
    (schemaDatabaseCodes.has(errorCode) || connectionDatabaseCodes.has(errorCode))
      ? errorCode
      : null);

  const schemaNotReady =
    (errorCode !== null && schemaPrismaCodes.has(errorCode)) ||
    (errorCode !== null && schemaDatabaseCodes.has(errorCode)) ||
    (errorCode === "P2010" && databaseCode !== null && schemaDatabaseCodes.has(databaseCode));
  if (schemaNotReady) {
    return {
      code: "DATABASE_SCHEMA_NOT_READY",
      message: "Store data is temporarily unavailable while an update completes.",
      errorCode,
      databaseCode,
    };
  }

  const databaseUnavailable =
    (errorCode !== null && connectionPrismaCodes.has(errorCode)) ||
    (errorCode !== null && connectionDatabaseCodes.has(errorCode)) ||
    (databaseCode !== null && connectionDatabaseCodes.has(databaseCode));
  if (databaseUnavailable) {
    return {
      code: "DATABASE_UNAVAILABLE",
      message: "Store data is temporarily unavailable. Please try again.",
      errorCode,
      databaseCode,
    };
  }

  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function toFieldErrors(error: ZodError): ApiFieldErrors {
  return Object.fromEntries(
    Object.entries(error.flatten().fieldErrors).flatMap(([field, messages]) => {
      const firstMessage = Array.isArray(messages) ? messages[0] : undefined;
      return typeof firstMessage === "string" ? [[field, firstMessage]] : [];
    }),
  );
}
