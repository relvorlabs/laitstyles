import "server-only";

import type { AuthPrincipal, StoreMembership } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import type { StoreMembershipRow } from "@/lib/supabase/types";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type VerifiedIdentity = {
  authUserId: string;
  email: string | null;
};

type ProfileLookup = {
  id: string;
  email: string | null;
};

function normalizeError(error: unknown) {
  if (!error) return undefined;
  if (typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "Unknown Supabase auth error";
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

  if (!user) return null;

  return {
    authUserId: user.id,
    email: user.email ?? null,
  };
}

async function getProfile(
  supabase: SupabaseServerClient,
  identity: VerifiedIdentity,
): Promise<{ profile: ProfileLookup; error?: string }> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,email")
    .eq("auth_user_id", identity.authUserId)
    .maybeSingle();

  if (error) {
    return {
      error: normalizeError(error),
      profile: {
        id: identity.authUserId,
        email: identity.email,
      },
    };
  }

  return {
    profile: {
      id: data?.id ?? identity.authUserId,
      email: data?.email ?? identity.email,
    },
  };
}

async function getStoreMemberships(
  supabase: SupabaseServerClient,
  profileId: string,
): Promise<{ memberships: StoreMembership[]; error?: string }> {
  const { data, error } = await supabase
    .from("store_memberships")
    .select("store_id,role,status")
    .eq("profile_id", profileId);

  if (error) {
    return {
      error: normalizeError(error),
      memberships: [],
    };
  }

  return {
    memberships: ((data ?? []) as Pick<StoreMembershipRow, "role" | "status" | "store_id">[]).map(
      (membership) => ({
        role: membership.role,
        status: membership.status,
        storeId: membership.store_id,
      }),
    ),
  };
}

async function getConsumerCustomerIds(supabase: SupabaseServerClient, profileId: string) {
  const { data, error } = await supabase.from("customers").select("id").eq("profile_id", profileId);

  if (error) return [];
  return (data ?? []).map((customer) => customer.id);
}

export async function getServerAuthPrincipal(): Promise<AuthPrincipal> {
  const supabase = await createClient();
  const identity = await getVerifiedIdentity(supabase);

  if (!identity) {
    return {
      consumerCustomerIds: [],
      profileId: null,
      storeMemberships: [],
    };
  }

  const profileResult = await getProfile(supabase, identity);
  const [membershipResult, consumerCustomerIds] = await Promise.all([
    getStoreMemberships(supabase, profileResult.profile.id),
    getConsumerCustomerIds(supabase, profileResult.profile.id),
  ]);
  const authorizationError = membershipResult.error ?? profileResult.error;

  return {
    authorizationError,
    authorizationLoaded: !authorizationError,
    consumerCustomerIds,
    profileId: profileResult.profile.id,
    storeMemberships: membershipResult.memberships,
  };
}

export async function isSignedIn() {
  const principal = await getServerAuthPrincipal();
  return Boolean(principal.profileId);
}
