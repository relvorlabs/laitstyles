import "server-only";

import { logger } from "@/lib/logger";

export type AuthProviderDiagnostic = {
  code?: string | null;
  status?: number | null;
  name?: string | null;
};

export function logAuthProviderFailure(
  operation: "password-sign-in" | "password-sign-up" | "sign-out" | "oauth-start" | "oauth-callback",
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
