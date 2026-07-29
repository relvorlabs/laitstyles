import "server-only";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import {
  type AccountEmailChangeInput,
  type AccountPasswordChangeInput,
  accountEmailChangeSchema,
  accountPasswordChangeSchema,
} from "@/modules/auth/schema";
import { getAuthRedirectUrl } from "@/modules/auth/server/redirects";
import {
  type AccountEmailChangeResult,
  type AccountPasswordChangeResult,
  AccountSecurityError,
  type AccountSecurityIdentity,
} from "@/modules/auth/types";

type SupabaseAuthErrorLike = { code?: string | null; status?: number | null } | null | undefined;
const FRESH_SESSION_MAX_AGE_MS = 15 * 60 * 1000;

/** Every account-security domain function receives an already-resolved
 * identity (see {@link getAccountSecurityIdentity}) instead of re-deriving it,
 * so tests and Route Handlers share one resolution path. */
export async function getAccountSecurityIdentity(): Promise<AccountSecurityIdentity | null> {
  const supabase = await createClient();
  const claimsResult = await supabase.auth.getClaims();
  const claims = claimsResult.data?.claims;
  const sessionId = claims?.session_id;
  if (!claims?.sub || typeof sessionId !== "string") return null;
  const assuranceLevel =
    claims.aal === "aal1" || claims.aal === "aal2" ? (claims.aal as "aal1" | "aal2") : null;

  return {
    authUserId: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
    sessionId,
    authenticatedAt:
      typeof claims.iat === "number" ? new Date(claims.iat * 1000).toISOString() : null,
    assuranceLevel,
  };
}

export async function requestAccountEmailChange(
  identity: AccountSecurityIdentity,
  input: AccountEmailChangeInput,
): Promise<AccountEmailChangeResult> {
  const parsed = accountEmailChangeSchema.parse(input);

  if (identity.email && parsed.email.toLowerCase() === identity.email.toLowerCase()) {
    throw new AccountSecurityError("EMAIL_UNCHANGED");
  }
  if (!hasFreshAuthentication(identity.authenticatedAt)) {
    throw new AccountSecurityError("REAUTHENTICATION_REQUIRED");
  }

  const supabase = await createClient();
  const emailRedirectTo = await getAuthRedirectUrl(
    `/auth/callback?next=${encodeURIComponent("/account/security")}`,
  );
  const { error } = await supabase.auth.updateUser({ email: parsed.email }, { emailRedirectTo });

  if (error) {
    logProviderFailure("account-email-change", error);
    throw mapAccountSecurityProviderError(error);
  }

  await prisma.audit_events.create({
    data: {
      actor_profile_id: identity.authUserId,
      action: "account.email_change_requested",
      target_table: "profiles",
      target_id: identity.authUserId,
      metadata: { email: parsed.email },
    },
  });

  return { status: "confirmation-sent", email: parsed.email };
}

export async function changeAccountPassword(
  identity: AccountSecurityIdentity,
  input: AccountPasswordChangeInput,
): Promise<AccountPasswordChangeResult> {
  const parsed = accountPasswordChangeSchema.parse(input);

  if (parsed.password === parsed.currentPassword) {
    throw new AccountSecurityError("PASSWORD_UNCHANGED");
  }

  if (!identity.email) {
    throw new AccountSecurityError("SESSION_UNAVAILABLE");
  }

  const supabase = await createClient();

  // Fresh-proof the request by re-verifying the current password, since this
  // plan does not build a reauthenticate()/nonce UI (see contract doc §1).
  const reproof = await supabase.auth.signInWithPassword({
    email: identity.email,
    password: parsed.currentPassword,
  });
  if (reproof.error) {
    logProviderFailure("account-password-reproof", reproof.error);
    throw new AccountSecurityError("INVALID_CURRENT_PASSWORD");
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.password });
  if (error) {
    logProviderFailure("account-password-change", error);
    throw mapAccountSecurityProviderError(error);
  }

  await prisma.audit_events.create({
    data: {
      actor_profile_id: identity.authUserId,
      action: "account.password_changed",
      target_table: "profiles",
      target_id: identity.authUserId,
      metadata: {},
    },
  });

  return { status: "updated" };
}

function hasFreshAuthentication(authenticatedAt: string | null): boolean {
  if (!authenticatedAt) return false;
  const issuedAt = new Date(authenticatedAt).getTime();
  if (!Number.isFinite(issuedAt)) return false;
  const age = Date.now() - issuedAt;
  return age >= 0 && age <= FRESH_SESSION_MAX_AGE_MS;
}

function mapAccountSecurityProviderError(error: SupabaseAuthErrorLike): AccountSecurityError {
  if (error?.code === "reauthentication_needed") {
    return new AccountSecurityError("REAUTHENTICATION_REQUIRED");
  }
  if (error?.code === "same_password") {
    return new AccountSecurityError("PASSWORD_UNCHANGED");
  }
  return new AccountSecurityError("PROVIDER_UNAVAILABLE");
}

function logProviderFailure(operation: string, error: SupabaseAuthErrorLike) {
  logger.warn(
    {
      operation,
      providerCode: error?.code ?? null,
      providerStatus: error?.status ?? null,
    },
    "Account security provider request failed",
  );
}
