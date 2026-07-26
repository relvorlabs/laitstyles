import "server-only";

import { ApiError } from "@/lib/errors/api-error";
import type { HoldActionError } from "@/modules/holds/types";

export function throwHoldActionError(error: HoldActionError): never {
  const fieldErrors: Record<string, string> = {};
  if (error.available !== undefined) fieldErrors.available = String(error.available);
  if (error.requested !== undefined) fieldErrors.requested = String(error.requested);

  throw new ApiError({
    code: error.code.replaceAll("-", "_").toUpperCase(),
    message: error.message,
    status:
      error.code === "hold-not-found" ? 404 : error.code === "invalid-hold-extension" ? 422 : 409,
    ...(Object.keys(fieldErrors).length ? { fieldErrors } : {}),
  });
}
