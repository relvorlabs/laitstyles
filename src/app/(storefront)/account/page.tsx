import { redirect } from "next/navigation";
import { getCurrentSession } from "@/modules/auth/server/session";
import { getOwnedProfile } from "@/modules/customers/server/account-profile";
import { listOwnedSavedProductIds } from "@/modules/customers/server/saved-products";
import { OverviewSection } from "@/modules/customers/ui/account/sections/overview-section";
import { getCommerceAccountOrders } from "@/modules/orders/server/account-commerce-orders";

export default async function AccountOverviewPage() {
  const session = await getCurrentSession();
  if (session.kind === "anonymous") {
    redirect("/?auth=signin&next=%2Faccount");
  }
  if (session.kind === "suspended") {
    redirect("/auth/error?code=provider-unavailable&next=%2Faccount");
  }
  if (session.kind === "unavailable") {
    throw new Error(`Could not load the account overview: ${session.error}`);
  }
  if (session.kind !== "consumer") {
    redirect("/?auth=signin&next=%2Faccount");
  }

  const [profile, orders, savedProductIds] = await Promise.all([
    getOwnedProfile(session),
    getCommerceAccountOrders(session.customerId),
    listOwnedSavedProductIds(session),
  ]);

  return (
    <OverviewSection
      email={profile.email}
      firstName={profile.firstName}
      orders={orders}
      phone={profile.phone}
      preferredName={profile.preferredName}
      savedCount={savedProductIds.length}
    />
  );
}
