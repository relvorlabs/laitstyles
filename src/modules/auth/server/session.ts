import "server-only";

import { cache } from "react";
import type { AuthDeniedReason } from "@/lib/auth/auth-errors";
import { hasCapability, type StaffCapability } from "@/lib/auth/permissions";
import { isStaffRole, type StaffRole } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import {
  type AuthUserMetadata,
  ensureConsumerAccount,
} from "@/modules/auth/server/account-provisioning";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type VerifiedIdentity = {
  authUserId: string;
  email: string | null;
  userMetadata: AuthUserMetadata;
};

export type ConsumerSession = {
  kind: "consumer";
  authUserId: string;
  email: string | null;
  displayName: string | null;
  phone: string | null;
  customerId: string;
};

export type StaffSession = {
  kind: "staff";
  authUserId: string;
  email: string | null;
  displayName: string | null;
  role: StaffRole;
};

export type CurrentSession =
  | { kind: "anonymous" }
  | { kind: "suspended"; authUserId: string; email: string | null }
  | { kind: "unavailable"; error: string }
  | ConsumerSession
  | StaffSession;

function readUserMetadata(value: unknown): AuthUserMetadata {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export async function getVerifiedIdentity(
  supabase: SupabaseServerClient,
): Promise<VerifiedIdentity | null> {
  const claimsResult = await supabase.auth.getClaims();
  const claims = claimsResult.data?.claims;
  if (claims?.sub) {
    return {
      authUserId: claims.sub,
      email: typeof claims.email === "string" ? claims.email : null,
      userMetadata: readUserMetadata(claims.user_metadata),
    };
  }

  const userResult = await supabase.auth.getUser();
  const user = userResult.data.user;
  return user
    ? {
        authUserId: user.id,
        email: user.email ?? null,
        userMetadata: readUserMetadata(user.user_metadata),
      }
    : null;
}

// The one current-user read for every server surface. Auth callback and the
// database trigger provision eagerly; this path repairs pre-existing or partial
// accounts only when the profile/customer invariant is missing.
export const getCurrentSession = cache(async (): Promise<CurrentSession> => {
  const identity = await getVerifiedIdentity(await createClient());
  if (!identity) return { kind: "anonymous" };

  try {
    let profile = await prisma.profiles.findUnique({
      where: { id: identity.authUserId },
      select: {
        role: true,
        status: true,
        display_name: true,
        phone: true,
        customer: { select: { id: true } },
      },
    });

    if (!profile || (profile.role === "consumer" && !profile.customer)) {
      const ensured = await ensureConsumerAccount({
        id: identity.authUserId,
        email: identity.email,
        userMetadata: identity.userMetadata,
      });
      profile = {
        role: ensured.profile.role,
        status: ensured.profile.status,
        display_name: ensured.profile.display_name,
        phone: ensured.profile.phone,
        customer: ensured.customerId ? { id: ensured.customerId } : null,
      };
    }

    if (profile.status !== "active") {
      return { kind: "suspended", authUserId: identity.authUserId, email: identity.email };
    }
    if (isStaffRole(profile.role)) {
      return {
        kind: "staff",
        authUserId: identity.authUserId,
        email: identity.email,
        displayName: profile.display_name,
        role: profile.role,
      };
    }

    if (!profile.customer) {
      throw new Error("Consumer account provisioning completed without a customer record.");
    }

    return {
      kind: "consumer",
      authUserId: identity.authUserId,
      email: identity.email,
      displayName: profile.display_name,
      phone: profile.phone,
      customerId: profile.customer.id,
    };
  } catch (error) {
    return {
      kind: "unavailable",
      error: error instanceof Error ? error.message : "Unknown authorization error",
    };
  }
});

export function isAuthenticated(session: CurrentSession): boolean {
  return session.kind === "consumer" || session.kind === "staff";
}

export type StaffAccess = { ok: true; role: StaffRole } | { ok: false; reason: AuthDeniedReason };

export async function getStaffAccess(
  capability: StaffCapability = "admin:access",
): Promise<StaffAccess> {
  const session = await getCurrentSession();
  if (session.kind === "anonymous") return { ok: false, reason: "signed-out" };
  if (session.kind === "unavailable") return { ok: false, reason: "authorization-unavailable" };
  if (session.kind === "suspended") return { ok: false, reason: "account-inactive" };
  if (session.kind !== "staff" || !hasCapability(session.role, capability)) {
    return { ok: false, reason: "missing-capability" };
  }
  return { ok: true, role: session.role };
}
