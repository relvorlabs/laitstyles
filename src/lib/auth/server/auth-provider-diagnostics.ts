import "server-only";

import { logger } from "@/lib/logger";

export type AuthProviderDiagnostic = {
  code?: string | null;
  status?: number | null;
  name?: string | null;
};

export type AuthProviderOperation =
  | "password-sign-in"
  | "password-sign-up"
  | "password-recovery-request"
  | "password-recovery-session"
  | "password-recovery-update"
  | "password-recovery-sign-out"
  | "signup-confirmation-resend"
  | "sign-out"
  | "oauth-start"
  | "oauth-callback"
  | "oauth-callback-user";

export function logAuthProviderFailure(
  operation: AuthProviderOperation,
  error: AuthProviderDiagnostic,
) {
  logger.warn(
    {
      operation,
      providerCode: error.code ?? null,
      providerStatus: error.status ?? null,
      providerErrorName: error.name ?? null,
    },
    "Auth provider request failed",
  );
}
