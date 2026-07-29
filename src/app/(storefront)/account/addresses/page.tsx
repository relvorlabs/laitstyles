import { redirect } from "next/navigation";
import { getCurrentSession } from "@/modules/auth/server/session";
import { listOwnedAddresses } from "@/modules/customers/server/addresses";
import { AddressesSection } from "@/modules/customers/ui/storefront/addresses-section";

export default async function AccountAddressesPage() {
  const session = await getCurrentSession();
  if (session.kind !== "consumer") redirect("/auth/sign-in?next=/account/addresses");
  const addresses = await listOwnedAddresses(session);
  return <AddressesSection initialAddresses={addresses} />;
}
