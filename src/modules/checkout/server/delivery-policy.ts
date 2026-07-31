import "server-only";

import { Prisma } from "@/lib/prisma";
import type { CheckoutDeliveryQuote } from "@/modules/checkout/types";

type DeliveryAddress = {
  id: string;
  city: string;
  state: string | null;
  country: string;
};

type DeliveryZoneRow = {
  id: string;
  name: string;
  city: string;
  rate: Prisma.Decimal;
  estimated_days: string | null;
  enabled: boolean;
  position: number;
};

type DeliveryPolicyClient = Pick<
  Prisma.TransactionClient,
  "delivery_zones" | "store_settings"
>;

const LAGOS_ISLAND_LOCATIONS = [
  "ajah",
  "epe",
  "ibeju",
  "ikoyi",
  "lagos island",
  "lekki",
  "oniru",
  "victoria island",
];

export async function listCheckoutDeliveryQuotes(
  client: DeliveryPolicyClient,
  addresses: readonly DeliveryAddress[],
): Promise<CheckoutDeliveryQuote[]> {
  const policy = await loadDeliveryPolicy(client);
  return addresses.map((address) => resolveFromPolicy(address, policy));
}

export async function resolveCheckoutDeliveryQuote(
  client: DeliveryPolicyClient,
  address: DeliveryAddress,
): Promise<CheckoutDeliveryQuote> {
  return resolveFromPolicy(address, await loadDeliveryPolicy(client));
}

async function loadDeliveryPolicy(client: DeliveryPolicyClient): Promise<{
  zones: DeliveryZoneRow[];
  fallbackZoneId: string | null;
}> {
  const [zones, settings] = await Promise.all([
    client.delivery_zones.findMany({
      where: { enabled: true, position: { gte: 0 } },
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        city: true,
        rate: true,
        estimated_days: true,
        enabled: true,
        position: true,
      },
    }),
    client.store_settings.findUnique({ where: { id: 1 }, select: { selling: true } }),
  ]);
  return {
    zones,
    fallbackZoneId: selectFallbackZoneId(zones, readConfiguredFallbackId(settings?.selling)),
  };
}

function resolveFromPolicy(
  address: DeliveryAddress,
  policy: { zones: DeliveryZoneRow[]; fallbackZoneId: string | null },
): CheckoutDeliveryQuote {
  const fallback = policy.zones.find((zone) => zone.id === policy.fallbackZoneId) ?? null;
  const regional = findRegionalOverride(
    policy.zones.filter((zone) => zone.id !== policy.fallbackZoneId),
    address,
  );
  const selected = regional ?? fallback;

  if (!selected) {
    return {
      addressId: address.id,
      deliveryZoneId: null,
      label: "Nationwide delivery",
      coverageLabel: "Delivery across Nigeria",
      feeMinor: 0,
      estimatedDays: null,
      source: "free-fallback",
    };
  }

  return {
    addressId: address.id,
    deliveryZoneId: selected.id,
    label: regional ? selected.name : "Nationwide delivery",
    coverageLabel: regional ? `${selected.name} rate` : "Delivery across Nigeria",
    feeMinor: decimalToMinor(selected.rate),
    estimatedDays: selected.estimated_days,
    source: regional ? "regional-override" : "nationwide-fallback",
  };
}

function findRegionalOverride(
  zones: DeliveryZoneRow[],
  address: DeliveryAddress,
): DeliveryZoneRow | null {
  const city = normalizeLocation(address.city);
  const state = normalizeLocation(address.state ?? "");
  const location = [city, state].filter(Boolean).join(" ");

  const exact = zones.find((zone) => {
    const labels = [normalizeLocation(zone.city), normalizeLocation(zone.name)].filter(Boolean);
    return labels.some((label) => label === city || (Boolean(state) && label === state));
  });
  if (exact) return exact;

  if (location.includes("lagos")) {
    const isIsland = LAGOS_ISLAND_LOCATIONS.some((candidate) => location.includes(candidate));
    const lagosMatch = zones.find((zone) => {
      const label = normalizeLocation(`${zone.name} ${zone.city}`);
      return isIsland ? label.includes("island") : label.includes("mainland");
    });
    if (lagosMatch) return lagosMatch;
  }

  return (
    zones.find((zone) => {
      const label = normalizeLocation(`${zone.name} ${zone.city}`);
      if (!label || label.length < 3) return false;
      const cityMatches = Boolean(city) && (city.includes(label) || label.includes(city));
      const stateMatches = Boolean(state) && (state.includes(label) || label.includes(state));
      return cityMatches || stateMatches;
    }) ?? null
  );
}

function selectFallbackZoneId(
  zones: DeliveryZoneRow[],
  configuredId: string | null,
): string | null {
  if (configuredId && zones.some((zone) => zone.id === configuredId)) return configuredId;
  const semanticFallback = zones.find((zone) =>
    /nationwide|outside\s+lagos|rest\s+of\s+nigeria|national/i.test(zone.name),
  );
  return semanticFallback?.id ?? zones.at(-1)?.id ?? null;
}

function readConfiguredFallbackId(value: Prisma.JsonValue | undefined): string | null {
  const selling = asJsonRecord(value);
  const deliveryContext = asJsonRecord(selling?._deliveryContext);
  return typeof deliveryContext?.nationwideFallbackZoneId === "string"
    ? deliveryContext.nationwideFallbackZoneId
    : null;
}

function asJsonRecord(value: Prisma.JsonValue | undefined): Record<string, Prisma.JsonValue> | null {
  return value !== undefined && value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, Prisma.JsonValue>)
    : null;
}

function decimalToMinor(value: Prisma.Decimal): number {
  return Math.round(value.toNumber() * 100);
}

function normalizeLocation(value: string): string {
  return value.trim().toLocaleLowerCase("en-NG").replaceAll(/\s+/g, " ");
}
