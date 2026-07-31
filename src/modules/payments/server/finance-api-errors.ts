import "server-only";

import { ApiError } from "@/lib/errors/api-error";
import type { FinanceError } from "@/modules/payments/server/finance-types";

const statusByCode: Record<FinanceError["code"], number> = {
  FORBIDDEN: 403,
  FINANCE_PROVIDER_UNAVAILABLE: 503,
  FINANCE_RECORD_NOT_FOUND: 404,
  RECIPIENT_NOT_FOUND: 404,
  RECIPIENT_DUPLICATE: 409,
  RECIPIENT_IN_USE: 409,
  TRANSFER_NOT_FOUND: 404,
  TRANSFER_INVALID: 422,
  TRANSFER_INVALID_STATE: 409,
  TRANSFER_BALANCE_EXCEEDED: 409,
  TRANSFER_RECONCILIATION_REQUIRED: 409,
};

export function throwFinanceApiError(error: FinanceError): never {
  throw new ApiError({
    code: error.code,
    message: error.message,
    status: statusByCode[error.code],
  });
}
