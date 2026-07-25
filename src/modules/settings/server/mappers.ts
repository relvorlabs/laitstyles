import "server-only";

import type { Prisma } from "@/lib/prisma";
import { storeSettingsInputSchema } from "@/modules/settings/schema";
import type { StoreSettings } from "@/modules/settings/types";

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

export function mapStoreSettings(
  row: SettingsRow,
  zones: DeliveryZoneRow[],
  pickups: PickupRow[],
): StoreSettings {
  const sellingRecord = asRecord(row.selling);
  const pickupContext = parsePickupContext(sellingRecord?._pickupContext);
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
  const parsed = storeSettingsInputSchema.safeParse({
    identity: row.identity,
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

export function settingsJsonInput(
  settings: StoreSettings | Omit<StoreSettings, "updatedAt">,
): {
  identity: Prisma.InputJsonValue;
  selling: Prisma.InputJsonValue;
  payments: Prisma.InputJsonValue;
  notifications: Prisma.InputJsonValue;
} {
  return {
    identity: structuredClone(settings.identity) as Prisma.InputJsonValue,
    selling: {
      ...structuredClone(settings.selling),
      _pickupContext: Object.fromEntries(
        settings.delivery.pickupLocations.map((pickup) => [
          pickup.id,
          { city: pickup.city, instructions: pickup.instructions },
        ]),
      ),
    } as Prisma.InputJsonValue,
    payments: structuredClone(settings.payments) as Prisma.InputJsonValue,
    notifications: structuredClone(settings.notifications) as Prisma.InputJsonValue,
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

function asRecord(value: Prisma.JsonValue | undefined): Record<string, Prisma.JsonValue> | null {
  return value !== undefined && value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, Prisma.JsonValue>)
    : null;
}
