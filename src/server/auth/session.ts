import "server-only";

import type { AuthDeniedReason } from "@/lib/auth/auth-errors";
import { hasCapability, type StaffCapability } from "@/lib/auth/permissions";
import { isStaffRole, type StaffRole } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { ensureConsumerProfile } from "@/server/auth/profile";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type VerifiedIdentity = {
  authUserId: string;
  email: string | null;
};

export type ConsumerSession = {
  kind: "consumer";
  authUserId: string;
  email: string | null;
  customerId: string | null;
};

export type StaffSession = {
  kind: "staff";
  authUserId: string;
  email: string | null;
  role: StaffRole;
};

export type CurrentSession =
  | { kind: "anonymous" }
  | { kind: "suspended"; authUserId: string; email: string | null }
  | { kind: "unavailable"; error: string }
  | ConsumerSession
  | StaffSession;

export async function getVerifiedIdentity(
  supabase: SupabaseServerClient,
): Promise<VerifiedIdentity | null> {
  const claimsResult = await supabase.auth.getClaims();
  const claims = claimsResult.data?.claims;
  if (claims?.sub) {
    return {
      authUserId: claims.sub,
      email: typeof claims.email === "string" ? claims.email : null,
    };
  }

  const userResult = await supabase.auth.getUser();
  const user = userResult.data.user;
  return user ? { authUserId: user.id, email: user.email ?? null } : null;
}

// The one current-user read for every server surface. Read-only in steady state:
// profile provisioning happens at sign-in (auth callback); the create-if-missing
// fallback below only covers sessions that pre-date callback-time provisioning.
export async function getCurrentSession(): Promise<CurrentSession> {
  const identity = await getVerifiedIdentity(await createClient());
  if (!identity) return { kind: "anonymous" };

  try {
    const profile =
      (await prisma.profiles.findUnique({
        where: { id: identity.authUserId },
        select: { role: true, status: true },
      })) ?? (await ensureConsumerProfile(identity.authUserId, identity.email));

    if (profile.status !== "active") {
      return { kind: "suspended", authUserId: identity.authUserId, email: identity.email };
    }
    if (isStaffRole(profile.role)) {
      return {
        kind: "staff",
        authUserId: identity.authUserId,
        email: identity.email,
        role: profile.role,
      };
    }

    const customer = await prisma.customers.findFirst({
      where: { profile_id: identity.authUserId },
      select: { id: true },
    });
    return {
      kind: "consumer",
      authUserId: identity.authUserId,
      email: identity.email,
      customerId: customer?.id ?? null,
    };
  } catch (error) {
    return {
      kind: "unavailable",
      error: error instanceof Error ? error.message : "Unknown authorization error",
    };
  }
}

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
