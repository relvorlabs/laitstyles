import { redirect } from "next/navigation";
import { ProfileSection } from "@/features/storefront/account/sections/profile-section";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/modules/auth/server/session";

export default async function AccountProfilePage() {
  const session = await getCurrentSession();
  if (session.kind === "anonymous") {
    redirect("/?auth=signin&next=%2Faccount%2Fprofile");
  }
  if (session.kind === "suspended") {
    redirect("/auth/error?code=provider-unavailable&next=%2Faccount%2Fprofile");
  }
  if (session.kind === "unavailable") {
    throw new Error(`Could not load the account profile: ${session.error}`);
  }

  const [profile, details, customer] = await Promise.all([
    prisma.profiles.findUniqueOrThrow({
      where: { id: session.authUserId },
      select: { display_name: true, phone: true },
    }),
    prisma.profile_details.findUnique({
      where: { profile_id: session.authUserId },
      select: { first_name: true, last_name: true, preferred_name: true },
    }),
    session.kind === "consumer"
      ? prisma.customers.findUnique({
          where: { profile_id: session.authUserId },
          select: { name: true, phone: true },
        })
      : Promise.resolve(null),
  ]);

  const fallbackName = customer?.name ?? profile.display_name ?? session.email?.split("@")[0] ?? "";
  const [fallbackFirst = "", ...fallbackLastParts] = fallbackName.split(/\s+/).filter(Boolean);

  return (
    <ProfileSection
      email={session.email}
      firstName={details?.first_name || fallbackFirst}
      lastName={details?.last_name || fallbackLastParts.join(" ")}
      phone={profile.phone ?? customer?.phone ?? ""}
      preferredName={details?.preferred_name ?? profile.display_name ?? ""}
    />
  );
}
