import "server-only";

import type { z } from "zod";

const PAYSTACK_API_BASE_URL = "https://api.paystack.co";
const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_PROVIDER_MESSAGE_LENGTH = 240;

export class PaystackConfigurationError extends Error {
  constructor() {
    super("Paystack is not configured for this environment.");
    this.name = "PaystackConfigurationError";
  }
}

export class PaystackProviderError extends Error {
  readonly name = "PaystackProviderError";

  constructor(
    message: string,
    readonly operation: string,
    readonly status: number | null,
    readonly code: string | null = null,
    readonly requestId: string | null = null,
  ) {
    super(message);
  }
}

type QueryValue = boolean | number | string | undefined;

export type PaystackRequestOptions<TSchema extends z.ZodType> = {
  operation: string;
  path: string;
  schema: TSchema;
  method?: "DELETE" | "GET" | "PATCH" | "POST" | "PUT";
  body?: unknown;
  query?: Record<string, QueryValue>;
  fetchImplementation?: typeof fetch;
  timeoutMs?: number;
};

export function isPaystackConfigured() {
  return Boolean(process.env.PAYSTACK_SECRET_KEY?.trim());
}

export async function paystackRequest<TSchema extends z.ZodType>(
  options: PaystackRequestOptions<TSchema>,
): Promise<z.output<TSchema>> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!secretKey) throw new PaystackConfigurationError();

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1) {
    throw new TypeError("Paystack request timeout must be a positive integer.");
  }

  const url = new URL(options.path, PAYSTACK_API_BASE_URL);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await (options.fetchImplementation ?? fetch)(url.toString(), {
      method: options.method ?? "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${secretKey}`,
        ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (error) {
    const timedOut = controller.signal.aborted;
    throw new PaystackProviderError(
      timedOut ? "Paystack request timed out." : "Paystack could not be reached.",
      options.operation,
      null,
      timedOut ? "PAYSTACK_TIMEOUT" : "PAYSTACK_UNAVAILABLE",
    );
  } finally {
    clearTimeout(timeout);
  }

  const requestId = response.headers.get("x-request-id");
  const text = await response.text();
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new PaystackProviderError(
      `Paystack returned an unreadable response (${response.status}).`,
      options.operation,
      response.status,
      "PAYSTACK_INVALID_RESPONSE",
      requestId,
    );
  }

  if (!response.ok || isProviderFailure(payload)) {
    throw new PaystackProviderError(
      sanitizeProviderMessage(extractString(payload, "message"), secretKey) ??
        `Paystack request failed (${response.status}).`,
      options.operation,
      response.status,
      sanitizeProviderCode(extractString(payload, "code")),
      requestId,
    );
  }

  const parsed = options.schema.safeParse(payload);
  if (!parsed.success) {
    throw new PaystackProviderError(
      `Paystack returned an invalid response for ${options.operation}.`,
      options.operation,
      response.status,
      "PAYSTACK_INVALID_RESPONSE",
      requestId,
    );
  }

  return parsed.data;
}

function isProviderFailure(payload: unknown) {
  return Boolean(
    payload &&
      typeof payload === "object" &&
      !Array.isArray(payload) &&
      Reflect.get(payload, "status") === false,
  );
}

function extractString(payload: unknown, key: string): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const value = Reflect.get(payload, key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function sanitizeProviderMessage(message: string | null, secretKey: string): string | null {
  if (!message) return null;
  const redacted = message
    .replaceAll(secretKey, "[REDACTED]")
    .replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]")
    .replace(/sk_(?:live|test)_[A-Za-z0-9]+/g, "[REDACTED]");
  return redacted.slice(0, MAX_PROVIDER_MESSAGE_LENGTH);
}

function sanitizeProviderCode(code: string | null): string | null {
  return code?.slice(0, 80) ?? null;
}
