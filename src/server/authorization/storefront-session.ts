import "server-only";

import type { AccountRole } from "@/lib/auth/roles";
import { getVerifiedIdentity } from "@/lib/auth/server/session";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export interface StorefrontSession {
  authUserId: string;
  email: string | null;
  role: AccountRole;
  customerId: string | null;
}

export async function getStorefrontSession(): Promise<StorefrontSession | null> {
  const identity = await getVerifiedIdentity(await createClient());
  if (!identity) return null;

  const profile = await prisma.profiles.findUnique({
    where: { id: identity.authUserId },
    select: { role: true, status: true },
  });
  if (profile?.status !== "active") return null;

  const role = profile.role;
  const customer =
    role === "consumer"
      ? await prisma.customers.findFirst({
          where: { profile_id: identity.authUserId },
          select: { id: true },
        })
      : null;

  return {
    authUserId: identity.authUserId,
    email: identity.email,
    role,
    customerId: customer?.id ?? null,
  };
}

export async function requireStorefrontSession(): Promise<StorefrontSession> {
  const session = await getStorefrontSession();
  if (session?.role !== "consumer") {
    throw new Error("A consumer account is required.");
  }
  return session;
}
