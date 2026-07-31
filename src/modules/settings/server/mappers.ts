import "server-only";

import type { Prisma } from "@/lib/prisma";
import { storeSettingsInputSchema } from "@/modules/settings/schema";
import type { StoreBrandLogo, StoreSettings } from "@/modules/settings/types";

type SettingsRow = {
  identity: Prisma.JsonValue;
  selling: Prisma.JsonValue;
  payments: Prisma.JsonValue;
  notifications: Prisma.JsonValue;
  updated_at: Date;
};
type DeliveryZoneRow = {
  id: string;
  name: string;
  rate: Prisma.Decimal;
  estimated_days: string | null;
  enabled: boolean;
};
type PickupRow = {
  id: string;
  name: string;
  address: string;
  enabled: boolean;
};

type PickupContext = Record<string, { city?: string; instructions?: string }>;
type DeliveryContext = { nationwideFallbackZoneId?: string };

export function mapStoreSettings(
  row: SettingsRow,
  zones: DeliveryZoneRow[],
  pickups: PickupRow[],
  logo: StoreBrandLogo | null,
): StoreSettings {
  const sellingRecord = asRecord(row.selling);
  const pickupContext = parsePickupContext(sellingRecord?._pickupContext);
  const deliveryContext = parseDeliveryContext(sellingRecord?._deliveryContext);
  const nationwideFallbackZoneId = selectNationwideFallbackZoneId(
    zones,
    deliveryContext.nationwideFallbackZoneId,
  );
  const delivery = {
    zones: zones.map((zone) => {
      const [estimatedMinDays, estimatedMaxDays] = parseEstimatedDays(zone.estimated_days);
      return {
        id: zone.id,
        name: zone.name,
        rate: zone.rate.toNumber(),
        estimatedMinDays,
        estimatedMaxDays,
        enabled: zone.enabled,
        isNationwideFallback: zone.id === nationwideFallbackZoneId,
      };
    }),
    pickupLocations: pickups.map((pickup) => ({
      id: pickup.id,
      name: pickup.name,
      address: pickup.address,
      city: pickupContext[pickup.id]?.city ?? "",
      instructions: pickupContext[pickup.id]?.instructions ?? "",
      enabled: pickup.enabled,
    })),
  };
  const identityRecord = asRecord(row.identity) ?? {};
  const parsed = storeSettingsInputSchema.safeParse({
    identity: { ...identityRecord, logo },
    selling: row.selling,
    payments: row.payments,
    notifications: row.notifications,
    delivery,
  });
  if (!parsed.success) {
    throw new Error(`Persisted store settings are invalid: ${parsed.error.message}`);
  }
  return { ...parsed.data, updatedAt: row.updated_at.toISOString() };
}

export function settingsJsonInput(settings: StoreSettings | Omit<StoreSettings, "updatedAt">): {
  identity: Prisma.InputJsonValue;
  selling: Prisma.InputJsonValue;
  payments: Prisma.InputJsonValue;
  notifications: Prisma.InputJsonValue;
} {
  const { logo: _logo, ...identityWithoutLogo } = structuredClone(settings.identity);
  const nationwideFallbackZoneId =
    settings.delivery.zones.find((zone) => zone.enabled && zone.isNationwideFallback)?.id ?? null;
  return {
    identity: identityWithoutLogo as Prisma.InputJsonValue,
    selling: {
      ...structuredClone(settings.selling),
      _pickupContext: Object.fromEntries(
        settings.delivery.pickupLocations.map((pickup) => [
          pickup.id,
          { city: pickup.city, instructions: pickup.instructions },
        ]),
      ),
      _deliveryContext: { nationwideFallbackZoneId },
    } as Prisma.InputJsonValue,
    payments: structuredClone(settings.payments) as Prisma.InputJsonValue,
    notifications: structuredClone(settings.notifications) as Prisma.InputJsonValue,
  };
}

type StoreBrandAssetRow = {
  cloudinary_assets: {
    public_id: string;
    secure_url: string;
    delivery_url: string | null;
    width: number | null;
    height: number | null;
    format: string | null;
    bytes: number | null;
  };
};

export function mapStoreBrandLogo(
  row: StoreBrandAssetRow | null | undefined,
): StoreBrandLogo | null {
  if (!row) return null;
  const asset = row.cloudinary_assets;
  return {
    publicId: asset.public_id,
    url: asset.delivery_url ?? asset.secure_url,
    width: asset.width,
    height: asset.height,
    format: asset.format,
    bytes: asset.bytes,
  };
}

export function formatEstimatedDays(minimum: number, maximum: number) {
  return minimum === maximum ? String(minimum) : `${minimum}-${maximum}`;
}

function parseEstimatedDays(value: string | null): [number, number] {
  const values = (value ?? "1").match(/\d+/g)?.map(Number) ?? [1];
  const minimum = Math.max(1, values[0] ?? 1);
  const maximum = Math.max(minimum, values[1] ?? minimum);
  return [minimum, maximum];
}

function parsePickupContext(value: Prisma.JsonValue | undefined): PickupContext {
  const record = asRecord(value);
  if (!record) return {};
  return Object.fromEntries(
    Object.entries(record).flatMap(([id, context]) => {
      const item = asRecord(context);
      if (!item) return [];
      return [
        [
          id,
          {
            city: typeof item.city === "string" ? item.city : "",
            instructions: typeof item.instructions === "string" ? item.instructions : "",
          },
        ],
      ];
    }),
  );
}

function parseDeliveryContext(value: Prisma.JsonValue | undefined): DeliveryContext {
  const record = asRecord(value);
  return {
    nationwideFallbackZoneId:
      typeof record?.nationwideFallbackZoneId === "string"
        ? record.nationwideFallbackZoneId
        : undefined,
  };
}

function selectNationwideFallbackZoneId(
  zones: DeliveryZoneRow[],
  configuredId: string | undefined,
): string | null {
  if (configuredId && zones.some((zone) => zone.id === configuredId && zone.enabled)) {
    return configuredId;
  }
  const semanticFallback = zones.find(
    (zone) =>
      zone.enabled &&
      /nationwide|outside\s+lagos|rest\s+of\s+nigeria|national/i.test(zone.name),
  );
  if (semanticFallback) return semanticFallback.id;
  return [...zones].reverse().find((zone) => zone.enabled)?.id ?? null;
}

function asRecord(value: Prisma.JsonValue | undefined): Record<string, Prisma.JsonValue> | null {
  return value !== undefined && value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, Prisma.JsonValue>)
    : null;
}
