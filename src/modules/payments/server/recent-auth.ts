import "server-only";

import { ApiError } from "@/lib/errors/api-error";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_MAX_AUTH_AGE_SECONDS = 15 * 60;

export async function requireRecentFinancialAuthentication(
  maxAgeSeconds = DEFAULT_MAX_AUTH_AGE_SECONDS,
): Promise<void> {
  if (!Number.isSafeInteger(maxAgeSeconds) || maxAgeSeconds < 60) {
    throw new TypeError("Recent-auth maximum age must be at least 60 seconds.");
  }

  const claimsResult = await (await createClient()).auth.getClaims();
  const claims = claimsResult.data?.claims;
  const issuedAt = claims && typeof claims.iat === "number" ? claims.iat : null;
  const subject = claims && typeof claims.sub === "string" ? claims.sub : null;
  const nowSeconds = Math.floor(Date.now() / 1_000);

  if (!subject || issuedAt === null || issuedAt > nowSeconds || nowSeconds - issuedAt > maxAgeSeconds) {
    throw new ApiError({
      code: "MFA_CHALLENGE_REQUIRED",
      message: "Confirm your identity again before moving money.",
      status: 403,
    });
  }
}
