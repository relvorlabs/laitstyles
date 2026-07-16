import "server-only";

import type { AuthPrincipal } from "@/lib/auth/guards";
import { ensureConsumerProfile } from "@/lib/auth/server/profile";
import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type VerifiedIdentity = {
  authUserId: string;
  email: string | null;
};

function normalizeError(error: unknown) {
  return error instanceof Error ? error.message : "Unknown authorization error";
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
    };
  }

  const userResult = await supabase.auth.getUser();
  const user = userResult.data.user;
  return user ? { authUserId: user.id, email: user.email ?? null } : null;
}

export async function getServerAuthPrincipal(): Promise<AuthPrincipal> {
  const supabase = await createClient();
  const identity = await getVerifiedIdentity(supabase);
  if (!identity) {
    return { consumerCustomerIds: [], profileId: null, role: null };
  }

  try {
    const profile = await ensureConsumerProfile(identity.authUserId, identity.email);
    const customers =
      profile.role === "consumer"
        ? await (await import("@/lib/prisma")).prisma.customers.findMany({
            where: { profile_id: profile.id },
            select: { id: true },
          })
        : [];

    return {
      authorizationLoaded: true,
      consumerCustomerIds: customers.map((customer) => customer.id),
      profileId: profile.id,
      role: profile.role,
    };
  } catch (error) {
    return {
      authorizationError: normalizeError(error),
      authorizationLoaded: false,
      consumerCustomerIds: [],
      profileId: identity.authUserId,
      role: null,
    };
  }
}

export async function isSignedIn() {
  return Boolean((await getServerAuthPrincipal()).profileId);
}
