import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/modules/auth/server/session";
import { getCheckout } from "@/modules/checkout/server/get-checkout";
import { CheckoutFlow } from "@/modules/checkout/ui/checkout-flow";
import { CheckoutRecovery } from "@/modules/checkout/ui/checkout-recovery";
import { listOwnedAddresses } from "@/modules/customers/server/addresses";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{
    checkout?: string | string[];
    recovery?: string | string[];
  }>;
}) {
  const session = await getCurrentSession();
  if (session.kind !== "consumer") redirect("/auth/sign-in?next=/checkout");
  if (!session.email) redirect("/account/profile?next=/checkout");

  const params = await searchParams;
  const checkoutId = typeof params.checkout === "string" ? params.checkout.trim() : "";
  const recovery = params.recovery === "1";

  if (checkoutId) {
    const checkout = await getCheckout(session, checkoutId);
    if (!checkout.ok) redirect("/checkout");
    if (checkout.value.status === "success") {
      redirect(
        `/order-confirmation?order=${encodeURIComponent(checkout.value.orderNumber)}`,
      );
    }
    if (!recovery) {
      redirect(
        `/checkout?checkout=${encodeURIComponent(checkout.value.checkoutId)}&recovery=1`,
      );
    }
    return <CheckoutRecovery initialCheckout={checkout.value} />;
  }

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
