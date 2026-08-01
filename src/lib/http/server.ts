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

type SafeDatabaseCodes = {
  errorCode: string | null;
  databaseCode: string | null;
  allCodes: readonly string[];
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
  "EAUTHTIMEOUT",
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

  const prismaDiagnostics = readPrismaKnownRequestDiagnostics(error);
  logger.error(
    {
      ...diagnosticContext,
      ...(prismaDiagnostics ?? {}),
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

function readPrismaKnownRequestDiagnostics(error: unknown): {
  errorCode: string;
  prismaMeta?: { modelName?: string; target?: string | string[] };
} | null {
  const record = asRecord(error);
  if (record?.name !== "PrismaClientKnownRequestError") return null;
  const errorCode = readString(record.code);
  if (!errorCode || !/^P\d{4}$/.test(errorCode)) return null;

  const meta = asRecord(record.meta);
  const modelName = readSafeDiagnosticString(meta?.modelName);
  const target = readSafeDiagnosticTarget(meta?.target);
  const prismaMeta = {
    ...(modelName ? { modelName } : {}),
    ...(target ? { target } : {}),
  };

  return {
    errorCode,
    ...(Object.keys(prismaMeta).length ? { prismaMeta } : {}),
  };
}

function readSafeDiagnosticString(value: unknown): string | null {
  return typeof value === "string" && /^[A-Za-z][A-Za-z0-9_]{0,127}$/.test(value) ? value : null;
}

function readSafeDiagnosticTarget(value: unknown): string | string[] | null {
  if (typeof value === "string") return readSafeDiagnosticString(value);
  if (!Array.isArray(value) || value.length > 16) return null;
  const entries = value.map(readSafeDiagnosticString);
  return entries.every((entry): entry is string => entry !== null) ? entries : null;
}

function classifyDatabaseFailure(error: unknown): DatabaseFailure | null {
  const { errorCode, databaseCode, allCodes } = collectSafeDatabaseCodes(error);
  if (allCodes.length === 0) return null;

  const schemaNotReady =
    allCodes.some((code) => schemaPrismaCodes.has(code) || schemaDatabaseCodes.has(code)) ||
    (allCodes.includes("P2010") && allCodes.some((code) => schemaDatabaseCodes.has(code)));
  if (schemaNotReady) {
    return {
      code: "DATABASE_SCHEMA_NOT_READY",
      message: "Store data is temporarily unavailable while an update completes.",
      errorCode,
      databaseCode,
    };
  }

  const databaseUnavailable = allCodes.some(
    (code) =>
      connectionPrismaCodes.has(code) || connectionDatabaseCodes.has(code) || code.startsWith("08"),
  );
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

function collectSafeDatabaseCodes(error: unknown, maxDepth = 3): SafeDatabaseCodes {
  const codes: string[] = [];
  let current: unknown = error;

  for (let depth = 0; depth <= maxDepth; depth += 1) {
    const record = asRecord(current);
    if (!record) break;
    const meta = asRecord(record.meta);

    pushCode(codes, record.code);
    pushCode(codes, record.errorCode);
    pushCode(codes, record.originalCode);
    pushCode(codes, record.errno);
    pushCode(codes, meta?.code);
    pushCode(codes, meta?.databaseCode);
    pushCode(codes, meta?.originalCode);

    current = record.cause;
  }

  const uniqueCodes = [...new Set(codes)];
  const errorCode = uniqueCodes.find((code) => /^P\d{4}$/.test(code)) ?? uniqueCodes[0] ?? null;
  const databaseCode =
    uniqueCodes.find(
      (code) =>
        schemaDatabaseCodes.has(code) || connectionDatabaseCodes.has(code) || code.startsWith("08"),
    ) ?? null;

  return { errorCode, databaseCode, allCodes: uniqueCodes };
}

function pushCode(target: string[], value: unknown): void {
  const code = readString(value);
  if (code) target.push(code);
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
