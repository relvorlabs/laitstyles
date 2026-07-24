import "server-only";

import { ApiError } from "@/lib/errors/api-error";

export type ApiPermissionOptions = {
  code?: string;
  message?: string;
  status?: 403 | 404;
};

export function requireApiPermission(
  allowed: boolean,
  options: ApiPermissionOptions = {},
): asserts allowed {
  if (allowed) return;

  throw new ApiError({
    code: options.code ?? "FORBIDDEN",
    message: options.message ?? "This account cannot perform that action.",
    status: options.status ?? 403,
  });
}
