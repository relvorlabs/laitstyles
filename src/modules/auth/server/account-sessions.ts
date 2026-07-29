import "server-only";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import {
  AccountSecurityError,
  type AccountSecurityIdentity,
  type AccountSessionSummary,
  type SignOutOthersResult,
} from "@/modules/auth/types";

type ProviderErrorLike = { code?: string | null; status?: number | null } | null | undefined;

export async function getAccountSessionSummary(
  identity: AccountSecurityIdentity,
): Promise<AccountSessionSummary> {
  const supabase = await createClient();
  const [claimsResult, assuranceResult] = await Promise.all([
    supabase.auth.getClaims(),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);

  const claims = claimsResult.data?.claims;
  const authenticatedAt =
    typeof claims?.iat === "number" ? new Date(claims.iat * 1000).toISOString() : null;
  const assuranceLevel = assuranceResult.data?.currentLevel ?? null;

  return {
    current: {
      sessionId: identity.sessionId,
      authenticatedAt,
      assuranceLevel,
    },
    otherSessions: { kind: "count-unavailable" },
  };
}

export async function signOutOtherSessions(
  identity: AccountSecurityIdentity,
): Promise<SignOutOthersResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "others" });

  if (error) {
    logProviderFailure("sessions-sign-out-others", error);
    throw new AccountSecurityError("PROVIDER_UNAVAILABLE");
  }

  await prisma.audit_events.create({
    data: {
      actor_profile_id: identity.authUserId,
      action: "account.sessions.others_signed_out",
      target_table: "profiles",
      target_id: identity.authUserId,
      metadata: { sessionId: identity.sessionId },
    },
  });

  return { status: "signed-out" };
}

function logProviderFailure(operation: string, error: ProviderErrorLike) {
  logger.warn(
    {
      operation,
      providerCode: error?.code ?? null,
      providerStatus: error?.status ?? null,
    },
    "Account session provider request failed",
  );
}
