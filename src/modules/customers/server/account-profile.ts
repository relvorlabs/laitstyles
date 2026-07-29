import "server-only";

import { prisma } from "@/lib/prisma";
import type { ConsumerSession } from "@/modules/auth/server/session";
import type { OwnedProfile, UpdateOwnedProfileInput } from "@/modules/customers/types";

export async function getOwnedProfile(identity: ConsumerSession): Promise<OwnedProfile> {
  const [profile, details, customer] = await Promise.all([
    prisma.profiles.findUniqueOrThrow({
      where: { id: identity.authUserId },
      select: { display_name: true, phone: true },
    }),
    prisma.profile_details.findUnique({
      where: { profile_id: identity.authUserId },
      select: { first_name: true, last_name: true, preferred_name: true },
    }),
    prisma.customers.findUnique({
      where: { id: identity.customerId },
      select: { name: true, phone: true },
    }),
  ]);

  const fallbackName =
    customer?.name ?? profile.display_name ?? identity.email?.split("@")[0] ?? "";
  const [fallbackFirst = "", ...fallbackLastParts] = fallbackName.split(/\s+/).filter(Boolean);

  return {
    authUserId: identity.authUserId,
    email: identity.email,
    firstName: details?.first_name || fallbackFirst,
    lastName: details?.last_name || fallbackLastParts.join(" "),
    preferredName: details?.preferred_name ?? profile.display_name ?? "",
    phone: profile.phone ?? customer?.phone ?? "",
  };
}

export async function updateOwnedProfile(
  identity: ConsumerSession,
  input: UpdateOwnedProfileInput,
): Promise<OwnedProfile> {
  const preferredName = input.preferredName || null;
  const phone = input.phone || null;
  const fullName = `${input.firstName} ${input.lastName}`.trim();
  const displayName = preferredName || fullName;

  await prisma.$transaction(async (tx) => {
    await tx.profiles.update({
      where: { id: identity.authUserId },
      data: { display_name: displayName, phone },
    });

    await tx.profile_details.upsert({
      where: { profile_id: identity.authUserId },
      update: {
        first_name: input.firstName,
        last_name: input.lastName,
        preferred_name: preferredName,
      },
      create: {
        profile_id: identity.authUserId,
        first_name: input.firstName,
        last_name: input.lastName,
        preferred_name: preferredName,
      },
    });

    await tx.customers.update({
      where: { id: identity.customerId },
      data: { name: fullName, email: identity.email, phone },
    });
  });

  return {
    authUserId: identity.authUserId,
    email: identity.email,
    firstName: input.firstName,
    lastName: input.lastName,
    preferredName: preferredName ?? "",
    phone: phone ?? "",
  };
}
