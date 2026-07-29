import "server-only";

import { ApiError } from "@/lib/errors/api-error";
import { requireApiSession } from "@/lib/http/auth";
import { getAccountSecurityIdentity } from "@/modules/auth/server/account-security";
import {
  type AccountSecurityErrorCode,
  type AccountSecurityIdentity,
  isAccountSecurityError,
} from "@/modules/auth/types";

const STATUS_BY_ACCOUNT_SECURITY_CODE: Record<AccountSecurityErrorCode, number> = {
  PASSWORD_UNCHANGED: 422,
  INVALID_CURRENT_PASSWORD: 422,
  REAUTHENTICATION_REQUIRED: 409,
  EMAIL_UNCHANGED: 422,
  SESSION_UNAVAILABLE: 503,
  MFA_FACTOR_NOT_FOUND: 404,
  MFA_CHALLENGE_REQUIRED: 401,
  MFA_CHALLENGE_EXPIRED_OR_INVALID: 422,
  RESOURCE_NOT_OWNED: 403,
  PROVIDER_UNAVAILABLE: 502,
};

/** Every account-security Route Handler needs both "is this caller
 * authenticated" (existing `requireApiSession`, staff or consumer) and a
 * freshly-resolved identity carrying the current session id. Composed once
 * here so every route stays a thin adapter (Task 5, Step 3). */
export async function requireAccountSecurityIdentity(): Promise<AccountSecurityIdentity> {
  await requireApiSession();
  const identity = await getAccountSecurityIdentity();
  if (!identity) {
    throw new ApiError({
      code: "SESSION_UNAVAILABLE",
      message: "We could not verify this session. Sign in again and retry.",
      status: 503,
    });
  }
  return identity;
}

export function throwAccountSecurityError(error: unknown): never {
  if (isAccountSecurityError(error)) {
    throw new ApiError({
      code: error.code,
      message: error.message,
      status: STATUS_BY_ACCOUNT_SECURITY_CODE[error.code],
    });
  }
  throw error;
}
