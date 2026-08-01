import { describe, expect, it, vi } from "vitest";
import type { Prisma } from "@/lib/prisma";
import { listCheckoutDeliveryQuotes } from "@/modules/checkout/server/delivery-policy";

function decimal(value: number) {
  return { toNumber: () => value };
}

function transactionClient({
  fallbackZoneId = "zone-nationwide",
  zones,
}: {
  fallbackZoneId?: string | null;
  zones: Array<{
    id: string;
    name: string;
    city: string;
    rate: ReturnType<typeof decimal>;
    estimated_days: string | null;
    enabled: boolean;
    position: number;
  }>;
}) {
  return {
    delivery_zones: {
      findMany: vi.fn().mockResolvedValue(zones),
    },
    store_settings: {
      findUnique: vi.fn().mockResolvedValue({
        selling: {
          _deliveryContext: { nationwideFallbackZoneId: fallbackZoneId },
        },
      }),
    },
  } as unknown as Prisma.TransactionClient;
}

const nationwideZone = {
  id: "zone-nationwide",
  name: "Nationwide delivery",
  city: "Nigeria",
  rate: decimal(6_500),
  estimated_days: "2-5",
  enabled: true,
  position: 2,
};

const mainlandZone = {
  id: "zone-mainland",
  name: "Lagos mainland",
  city: "Lagos mainland",
  rate: decimal(3_500),
  estimated_days: "1-2",
  enabled: true,
  position: 0,
};

describe("nationwide delivery policy", () => {
  it("uses a regional override for a matching Lagos address", async () => {
    const tx = transactionClient({ zones: [mainlandZone, nationwideZone] });

    await expect(
      listCheckoutDeliveryQuotes(tx, [
        {
          id: "address-lagos",
          city: "Ikeja",
          state: "Lagos",
          country: "Nigeria",
        },
      ]),
    ).resolves.toEqual([
      {
        addressId: "address-lagos",
        deliveryZoneId: "zone-mainland",
        label: "Lagos mainland",
        coverageLabel: "Lagos mainland rate",
        feeMinor: 350_000,
        estimatedDays: "1-2",
        source: "regional-override",
      },
    ]);
  });

  it("keeps an Abuja address eligible through the configured nationwide fallback", async () => {
    const tx = transactionClient({ zones: [mainlandZone, nationwideZone] });

    await expect(
      listCheckoutDeliveryQuotes(tx, [
        {
          id: "address-abuja",
          city: "Abuja",
          state: "FCT",
          country: "Nigeria",
        },
      ]),
    ).resolves.toEqual([
      {
        addressId: "address-abuja",
        deliveryZoneId: "zone-nationwide",
        label: "Nationwide delivery",
        coverageLabel: "Delivery across Nigeria",
        feeMinor: 650_000,
        estimatedDays: "2-5",
        source: "nationwide-fallback",
      },
    ]);
  });

  it("falls back to complimentary nationwide delivery when no rates are configured", async () => {
    const tx = transactionClient({ fallbackZoneId: null, zones: [] });

    await expect(
      listCheckoutDeliveryQuotes(tx, [
        {
          id: "address-enugu",
          city: "Enugu",
          state: "Enugu",
          country: "Nigeria",
        },
      ]),
    ).resolves.toEqual([
      {
        addressId: "address-enugu",
        deliveryZoneId: null,
        label: "Nationwide delivery",
        coverageLabel: "Delivery across Nigeria",
        feeMinor: 0,
        estimatedDays: null,
        source: "free-fallback",
      },
    ]);
  });
});
