import "server-only";

import { getVerifiedIdentity } from "@/lib/auth/server/session";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { getActiveStore } from "@/server/commerce/store/active-store";

// Central identity resolution for the storefront. Identity always comes from
// Supabase Auth (verified JWT); customerId is derived server-side and passed
// explicitly into repositories — never trusted from the client
// (docs/storefront-v2/04 §4.1 #2). This is the ONE place that resolves who the
// current shopper is.

export interface StorefrontSession {
  authUserId: string;
  email: string | null;
  /** The customer record for the active store, if one has been provisioned.
   *  Provisioning happens on first shopper mutation, not here. */
  customerId: string | null;
}

export async function getStorefrontSession(): Promise<StorefrontSession | null> {
  const supabase = await createClient();
  const identity = await getVerifiedIdentity(supabase);
  if (!identity) return null;

  const store = await getActiveStore();
  const customer = await prisma.customers.findFirst({
    where: { store_id: store.id, profile_id: identity.authUserId },
    select: { id: true },
  });

  return {
    authUserId: identity.authUserId,
    email: identity.email,
    customerId: customer?.id ?? null,
  };
}

/** Fail-closed: throws when there is no authenticated shopper. */
export async function requireStorefrontSession(): Promise<StorefrontSession> {
  const session = await getStorefrontSession();
  if (!session) {
    throw new Error("Authentication required.");
  }
  return session;
}
