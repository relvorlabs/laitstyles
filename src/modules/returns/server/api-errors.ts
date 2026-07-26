import { ApiError } from "@/lib/errors/api-error";
import type { ReturnActionError } from "@/modules/returns/types";

export function throwReturnActionError(error: ReturnActionError): never {
  const fieldErrors: Record<string, string> = {};
  if (error.field) fieldErrors[error.field] = error.message;
  if (error.available !== undefined) fieldErrors.available = String(error.available);
  if (error.requested !== undefined) fieldErrors.requested = String(error.requested);

  throw new ApiError({
    code: error.code.toUpperCase().replaceAll("-", "_"),
    message: error.message,
    status: statusFor(error.code),
    ...(Object.keys(fieldErrors).length ? { fieldErrors } : {}),
  });
}

function statusFor(code: ReturnActionError["code"]) {
  if (
    code === "order-not-found" ||
    code === "return-not-found" ||
    code === "return-line-not-found"
  ) {
    return 404;
  }
  if (
    code === "invalid-return-transition" ||
    code === "return-line-not-sold" ||
    code === "return-quantity-exceeded" ||
    code === "insufficient-sold-stock" ||
    code === "insufficient-returned-stock" ||
    code === "stock-write-conflict"
  ) {
    return 409;
  }
  return 422;
}
