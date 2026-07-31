import "server-only";

import { ApiError } from "@/lib/errors/api-error";
import { getConfiguredAuthOrigin } from "@/modules/auth/server/redirects";

export function requireFinancialMutationOrigin(request: Request) {
  const origin = request.headers.get("origin")?.trim();
  if (!origin) {
    throw new ApiError({
      code: "ORIGIN_REQUIRED",
      message: "A trusted request origin is required.",
      status: 403,
    });
  }

  const allowed = new Set([new URL(request.url).origin]);
  const configured = getConfiguredAuthOrigin();
  if (configured) {
    try {
      allowed.add(new URL(configured).origin);
    } catch {
      // Invalid deployment configuration is not copied into the allow-list.
    }
  }
  let normalized: string;
  try {
    normalized = new URL(origin).origin;
  } catch {
    normalized = "invalid";
  }
  if (!allowed.has(normalized)) {
    throw new ApiError({
      code: "ORIGIN_NOT_ALLOWED",
      message: "This request origin is not allowed.",
      status: 403,
    });
  }
}

export function requireIdempotencyKey(request: Request) {
  const key = request.headers.get("idempotency-key")?.trim();
  if (!key || key.length < 8 || key.length > 200) {
    throw new ApiError({
      code: "IDEMPOTENCY_KEY_REQUIRED",
      message: "A valid Idempotency-Key header is required.",
      status: 400,
    });
  }
  return key;
}
