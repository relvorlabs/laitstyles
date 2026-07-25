import { ApiError } from "@/lib/errors/api-error";
import type { CustomerActionError } from "@/modules/customers/types";

export function throwCustomerActionError(error: CustomerActionError): never {
  throw new ApiError({
    code: error.code.toUpperCase().replaceAll("-", "_"),
    message: error.message,
    status: error.code === "customer-not-found" ? 404 : 422,
    ...(error.field ? { fieldErrors: { [error.field]: error.message } } : {}),
  });
}
