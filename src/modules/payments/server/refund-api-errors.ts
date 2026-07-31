import "server-only";

import { ApiError } from "@/lib/errors/api-error";
import type { AdminPaymentError } from "@/modules/payments/server/admin-payments";
import type { RefundError } from "@/modules/payments/server/refunds";

export function throwRefundApiError(error: RefundError): never {
  const status =
    error.code === "FORBIDDEN"
      ? 403
      : error.code === "REFUND_NOT_FOUND"
        ? 404
        : error.code === "REFUND_LIMIT_EXCEEDED" || error.code === "REFUND_INVALID_STATE"
          ? 409
          : error.code === "REFUND_RECONCILIATION_REQUIRED"
            ? 503
            : 422;
  throw new ApiError({
    code: error.code,
    message: error.message,
    status,
  });
}

export function throwAdminPaymentApiError(error: AdminPaymentError): never {
  throw new ApiError({
    code: error.code,
    message: error.message,
    status: error.code === "FORBIDDEN" ? 403 : 404,
  });
}
