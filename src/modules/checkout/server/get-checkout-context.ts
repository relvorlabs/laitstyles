import "server-only";

import { prisma } from "@/lib/prisma";
import type { ConsumerSession } from "@/modules/auth/server/session";
import type { CheckoutContext } from "@/modules/checkout/types";
import { getOwnedProfile } from "@/modules/customers/server/account-profile";
import { listOwnedAddresses } from "@/modules/customers/server/addresses";

export async function getCheckoutContext(identity: ConsumerSession): Promise<CheckoutContext> {
  const [profile, addresses, deliveryZones] = await Promise.all([
    getOwnedProfile(identity),
    listOwnedAddresses(identity),
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

  const defaultAddress = addresses.find((address) => address.isDefault) ?? addresses[0] ?? null;
  const matchingZone = defaultAddress
    ? deliveryZones.find(
        (zone) => normalizeLocation(zone.city) === normalizeLocation(defaultAddress.city),
      )
    : null;
  const selectedZone = matchingZone ?? deliveryZones[0] ?? null;

  return {
    profile,
    profileComplete: Boolean(
      profile.email && profile.firstName.trim() && profile.lastName.trim() && profile.phone.trim(),
    ),
    addresses,
    defaultAddressId: defaultAddress?.id ?? null,
    deliveryZones: deliveryZones.map((zone) => ({
      id: zone.id,
      name: zone.name,
      city: zone.city,
      feeMinor: Math.round(zone.rate.toNumber() * 100),
      estimatedDays: zone.estimated_days,
    })),
    selectedDeliveryZoneId: selectedZone?.id ?? null,
    deliveryAmountStatus: "estimated",
  };
}

function normalizeLocation(value: string): string {
  return value.trim().toLocaleLowerCase("en-NG");
}
