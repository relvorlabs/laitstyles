import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/modules/auth/server/session";
import { CheckoutFlow } from "@/modules/checkout/ui/checkout-flow";
import { listOwnedAddresses } from "@/modules/customers/server/addresses";

export default async function CheckoutPage() {
  const session = await getCurrentSession();
  if (session.kind !== "consumer") redirect("/auth/sign-in?next=/checkout");
  if (!session.email) redirect("/account/profile?next=/checkout");

  const [addresses, zones] = await Promise.all([
    listOwnedAddresses(session),
    prisma.delivery_zones.findMany({
      where: { enabled: true },
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        city: true,
        rate: true,
        estimated_days: true,
      },
    }),
  ]);

  return (
    <CheckoutFlow
      customerEmail={session.email}
      initialAddresses={addresses}
      initialZones={zones.map((zone) => ({
        id: zone.id,
        name: zone.name,
        city: zone.city,
        feeMinor: Math.round(zone.rate.toNumber() * 100),
        estimatedDays: zone.estimated_days,
      }))}
    />
  );
}
