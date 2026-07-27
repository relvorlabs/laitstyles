import "server-only";

import { prisma } from "@/lib/prisma";

export type AuthUserMetadata = Record<string, unknown> | null | undefined;

export type ConsumerIdentityInput = {
  id: string;
  email: string | null;
  userMetadata?: AuthUserMetadata;
};

function metadataText(metadata: AuthUserMetadata, ...keys: string[]) {
  for (const key of keys) {
    const value = metadata?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export function consumerProfileValues(identity: ConsumerIdentityInput) {
  const firstName = metadataText(identity.userMetadata, "first_name", "given_name");
  const lastName = metadataText(identity.userMetadata, "last_name", "family_name");
  const preferredName = metadataText(identity.userMetadata, "preferred_name");
  const fullName =
    metadataText(identity.userMetadata, "full_name", "name") ||
    [firstName, lastName].filter(Boolean).join(" ") ||
    identity.email?.split("@")[0] ||
    "Customer";

  return {
    firstName,
    lastName,
    preferredName: preferredName || null,
    fullName,
    displayName: preferredName || fullName,
  };
}

export async function ensureConsumerAccount(identity: ConsumerIdentityInput) {
  const values = consumerProfileValues(identity);

  return prisma.$transaction(async (transaction) => {
    const profile = await transaction.profiles.upsert({
      where: { id: identity.id },
      update: {
        email: identity.email,
        display_name: values.displayName,
      },
      create: {
        id: identity.id,
        email: identity.email,
        role: "consumer",
        display_name: values.displayName,
      },
      select: {
        id: true,
        role: true,
        status: true,
        display_name: true,
        phone: true,
      },
    });

    if (profile.role !== "consumer") {
      return { profile, customerId: null };
    }

    await transaction.profile_details.upsert({
      where: { profile_id: identity.id },
      update: {
        first_name: values.firstName,
        last_name: values.lastName,
        preferred_name: values.preferredName,
      },
      create: {
        profile_id: identity.id,
        first_name: values.firstName,
        last_name: values.lastName,
        preferred_name: values.preferredName,
      },
    });

    const customer = await transaction.customers.upsert({
      where: { profile_id: identity.id },
      update: {
        name: values.fullName,
        email: identity.email,
        phone: profile.phone,
      },
      create: {
        profile_id: identity.id,
        name: values.fullName,
        email: identity.email,
        phone: profile.phone,
      },
      select: { id: true },
    });

    return { profile, customerId: customer.id };
  });
}

// Compatibility entry point for callers that only have the verified identity.
export async function ensureConsumerProfile(authUserId: string, email: string | null) {
  return ensureConsumerAccount({ id: authUserId, email });
}
