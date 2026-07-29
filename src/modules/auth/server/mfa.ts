import "server-only";

import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import {
  type MfaChallengeInput,
  mfaChallengeSchema,
  type MfaEnrollTotpInput,
  mfaEnrollTotpSchema,
  type MfaVerifyInput,
  mfaVerifySchema,
} from "@/modules/auth/schema";
import { AccountSecurityError, type AccountSecurityIdentity } from "@/modules/auth/types";

type ProviderErrorLike = { code?: string | null; status?: number | null } | null | undefined;

export type MfaFactorSummary = {
  id: string;
  friendlyName: string | null;
  factorType: string;
  status: "verified" | "unverified";
};

export type MfaEnrollTotpResult = {
  status: "unverified";
  factorId: string;
  totp: { qrCode: string; secret: string; uri: string };
};

export type MfaChallengeResult = {
  challengeId: string;
  expiresAt: string;
};

export type MfaVerifyResult = { status: "verified"; factorId: string };
export type MfaUnenrollResult = { status: "removed"; factorId: string };

const DEFAULT_TOTP_FRIENDLY_NAME = "Authenticator app";

export async function listMfaFactors(_identity: AccountSecurityIdentity): Promise<{
  factors: MfaFactorSummary[];
}> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) {
    logProviderFailure("mfa-list-factors", error);
    throw new AccountSecurityError("PROVIDER_UNAVAILABLE");
  }

  return { factors: (data?.all ?? []).map(toFactorSummary) };
}

export async function enrollTotp(
  identity: AccountSecurityIdentity,
  input: MfaEnrollTotpInput = {},
): Promise<MfaEnrollTotpResult> {
  const parsed = mfaEnrollTotpSchema.parse(input);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: parsed.friendlyName ?? DEFAULT_TOTP_FRIENDLY_NAME,
  });

  if (error || !data) {
    logProviderFailure("mfa-enroll", error);
    throw new AccountSecurityError("PROVIDER_UNAVAILABLE");
  }

  await prisma.audit_events.create({
    data: {
      actor_profile_id: identity.authUserId,
      action: "account.mfa.factor_enrolled",
      target_table: "profiles",
      target_id: identity.authUserId,
      metadata: { factorId: data.id, factorType: "totp" },
    },
  });

  return {
    status: "unverified",
    factorId: data.id,
    totp: { qrCode: data.totp.qr_code, secret: data.totp.secret, uri: data.totp.uri },
  };
}

export async function createMfaChallenge(
  _identity: AccountSecurityIdentity,
  input: MfaChallengeInput,
): Promise<MfaChallengeResult> {
  const parsed = mfaChallengeSchema.parse(input);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.challenge({ factorId: parsed.factorId });

  if (error || !data) {
    logProviderFailure("mfa-challenge", error);
    throw mapMfaProviderError(error);
  }

  return {
    challengeId: data.id,
    expiresAt: new Date(data.expires_at * 1000).toISOString(),
  };
}

export async function verifyMfaChallenge(
  identity: AccountSecurityIdentity,
  challengeId: string,
  input: MfaVerifyInput,
): Promise<MfaVerifyResult> {
  const parsed = mfaVerifySchema.parse(input);
  const supabase = await createClient();
  const { error } = await supabase.auth.mfa.verify({
    factorId: parsed.factorId,
    challengeId,
    code: parsed.code,
  });

  if (error) {
    logProviderFailure("mfa-verify", error);
    throw mapMfaProviderError(error, "MFA_CHALLENGE_EXPIRED_OR_INVALID");
  }

  await prisma.audit_events.create({
    data: {
      actor_profile_id: identity.authUserId,
      action: "account.mfa.factor_verified",
      target_table: "profiles",
      target_id: identity.authUserId,
      metadata: { factorId: parsed.factorId },
    },
  });

  return { status: "verified", factorId: parsed.factorId };
}

export async function unenrollFactor(
  identity: AccountSecurityIdentity,
  factorId: string,
): Promise<MfaUnenrollResult> {
  const supabase = await createClient();
  const { data: listData, error: listError } = await supabase.auth.mfa.listFactors();
  if (listError) {
    logProviderFailure("mfa-list-before-unenroll", listError);
    throw new AccountSecurityError("PROVIDER_UNAVAILABLE");
  }

  const factors = listData?.all ?? [];
  const target = factors.find((factor) => factor.id === factorId);
  if (!target) {
    throw new AccountSecurityError("MFA_FACTOR_NOT_FOUND");
  }

  const verifiedCount = factors.filter((factor) => factor.status === "verified").length;
  const removesLastVerifiedFactor = target.status === "verified" && verifiedCount <= 1;

  if (removesLastVerifiedFactor) {
    const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalError) {
      logProviderFailure("mfa-assurance-level", aalError);
      throw new AccountSecurityError("PROVIDER_UNAVAILABLE");
    }
    if (aalData?.currentLevel !== "aal2") {
      throw new AccountSecurityError("MFA_CHALLENGE_REQUIRED");
    }
  }

  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) {
    logProviderFailure("mfa-unenroll", error);
    throw mapMfaProviderError(error);
  }

  await prisma.audit_events.create({
    data: {
      actor_profile_id: identity.authUserId,
      action: "account.mfa.factor_removed",
      target_table: "profiles",
      target_id: identity.authUserId,
      metadata: { factorId },
    },
  });

  return { status: "removed", factorId };
}

function toFactorSummary(factor: {
  id: string;
  friendly_name?: string;
  factor_type: string;
  status: string;
}): MfaFactorSummary {
  return {
    id: factor.id,
    friendlyName: factor.friendly_name ?? null,
    factorType: factor.factor_type,
    status: factor.status === "verified" ? "verified" : "unverified",
  };
}

function mapMfaProviderError(
  error: ProviderErrorLike,
  fallback: "PROVIDER_UNAVAILABLE" | "MFA_CHALLENGE_EXPIRED_OR_INVALID" = "PROVIDER_UNAVAILABLE",
): AccountSecurityError {
  if (error?.code === "mfa_factor_not_found") return new AccountSecurityError("MFA_FACTOR_NOT_FOUND");
  if (error?.code === "mfa_verification_failed" || error?.code === "mfa_challenge_expired") {
    return new AccountSecurityError("MFA_CHALLENGE_EXPIRED_OR_INVALID");
  }
  return new AccountSecurityError(fallback);
}

function logProviderFailure(operation: string, error: ProviderErrorLike) {
  logger.warn(
    {
      operation,
      providerCode: error?.code ?? null,
      providerStatus: error?.status ?? null,
    },
    "Account MFA provider request failed",
  );
}
