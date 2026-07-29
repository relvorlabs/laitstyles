import { redirect } from "next/navigation";
import { getCurrentSession } from "@/modules/auth/server/session";
import { getOwnedProfile } from "@/modules/customers/server/account-profile";
import { ProfileSection } from "@/modules/customers/ui/storefront/profile-section";

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
  if (session.kind !== "consumer") {
    redirect("/?auth=signin&next=%2Faccount%2Fprofile");
  }

  const profile = await getOwnedProfile(session);

  return (
    <ProfileSection
      email={profile.email}
      firstName={profile.firstName}
      lastName={profile.lastName}
      phone={profile.phone}
      preferredName={profile.preferredName}
    />
  );
}
