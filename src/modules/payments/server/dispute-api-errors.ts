import "server-only";

import { ApiError } from "@/lib/errors/api-error";
import type { DisputeError } from "@/modules/payments/server/disputes";

const statusByCode: Record<DisputeError["code"], number> = {
  FORBIDDEN: 403,
  DISPUTE_INVALID: 422,
  DISPUTE_NOT_FOUND: 404,
  DISPUTE_PAYMENT_NOT_FOUND: 503,
  DISPUTE_INVALID_STATE: 409,
  DISPUTE_COMMAND_PENDING: 409,
  DISPUTE_IDEMPOTENCY_CONFLICT: 409,
  DISPUTE_PROVIDER_UNAVAILABLE: 503,
};

export function throwDisputeApiError(error: DisputeError): never {
  throw new ApiError({
    code: error.code,
    message: error.message,
    status: statusByCode[error.code],
  });
}
