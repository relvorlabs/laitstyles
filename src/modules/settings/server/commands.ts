import "server-only";

import { err, ok, type Result } from "@/lib/errors";
import { Prisma, prisma } from "@/lib/prisma";
import type { StaffSession } from "@/modules/auth/server/session";
import { parseStoreSettingsInput } from "@/modules/settings/schema";
import {
  formatEstimatedDays,
  mapStoreSettings,
  settingsJsonInput,
} from "@/modules/settings/server/mappers";
import type {
  SaveStoreSettingsInput,
  StoreSettingsActionError,
  StoreSettingsActionSuccess,
} from "@/modules/settings/types";

export async function saveStoreSettings(
  actor: StaffSession,
  input: SaveStoreSettingsInput,
): Promise<Result<StoreSettingsActionSuccess, StoreSettingsActionError>> {
  const parsed = parseStoreSettingsInput(input);
  if (!parsed.ok) {
    return err({
      code: "invalid-settings",
      message: "Review the highlighted settings before saving.",
      issues: parsed.issues,
    });
  }

  return prisma.$transaction(async (tx) => {
    const [existingZones, existingSettings] = await Promise.all([
      tx.delivery_zones.findMany(),
      tx.store_settings.findUnique({ where: { id: 1 }, select: { selling: true } }),
    ]);
    const existingZoneIds = new Set(existingZones.map((zone) => zone.id));
    const persistedZones: (typeof existingZones)[number][] = [];
    for (const [position, zone] of parsed.value.delivery.zones.entries()) {
      if (isUuid(zone.id) && existingZoneIds.has(zone.id)) {
        persistedZones.push(
          await tx.delivery_zones.update({
            where: { id: zone.id },
            data: {
              name: zone.name,
              city: zone.name,
              rate: zone.rate.toFixed(2),
              estimated_days: formatEstimatedDays(zone.estimatedMinDays, zone.estimatedMaxDays),
              enabled: zone.enabled,
              position,
            },
          }),
        );
      } else {
        persistedZones.push(
          await tx.delivery_zones.create({
            data: {
              name: zone.name,
              city: zone.name,
              rate: zone.rate.toFixed(2),
              estimated_days: formatEstimatedDays(zone.estimatedMinDays, zone.estimatedMaxDays),
              enabled: zone.enabled,
              position,
            },
          }),
        );
      }
    }
    const retainedZoneIds = persistedZones.map((zone) => zone.id);
    await tx.delivery_zones.updateMany({
      where: { id: { notIn: retainedZoneIds } },
      data: { enabled: false, position: -1 },
    });

    const existingPickups = await tx.pickup_locations.findMany();
    const existingPickupIds = new Set(existingPickups.map((pickup) => pickup.id));
    const persistedPickups: (typeof existingPickups)[number][] = [];
    for (const [position, pickup] of parsed.value.delivery.pickupLocations.entries()) {
      if (isUuid(pickup.id) && existingPickupIds.has(pickup.id)) {
        persistedPickups.push(
          await tx.pickup_locations.update({
            where: { id: pickup.id },
            data: {
              name: pickup.name,
              address: pickup.address,
              enabled: pickup.enabled,
              position,
            },
          }),
        );
      } else {
        persistedPickups.push(
          await tx.pickup_locations.create({
            data: {
              name: pickup.name,
              address: pickup.address,
              enabled: pickup.enabled,
              position,
            },
          }),
        );
      }
    }
    const retainedPickupIds = persistedPickups.map((pickup) => pickup.id);
    await tx.pickup_locations.updateMany({
      where: { id: { notIn: retainedPickupIds } },
      data: { enabled: false, position: -1 },
    });

    const normalized = {
      ...parsed.value,
      delivery: {
        zones: parsed.value.delivery.zones.map((zone, index) => {
          const persisted = persistedZones[index];
          if (!persisted) throw new Error("Persisted delivery zone count did not match the input.");
          return { ...zone, id: persisted.id };
        }),
        pickupLocations: parsed.value.delivery.pickupLocations.map((pickup, index) => {
          const persisted = persistedPickups[index];
          if (!persisted) {
            throw new Error("Persisted pickup location count did not match the input.");
          }
          return { ...pickup, id: persisted.id };
        }),
      },
    };
    const json = settingsJsonInput(normalized);
    const selling = mergeJsonObjects(existingSettings?.selling, json.selling);
    const row = await tx.store_settings.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        identity: json.identity,
        selling,
        payments: json.payments,
        notifications: json.notifications,
        updated_by_profile_id: actor.authUserId,
      },
      update: {
        identity: json.identity,
        selling,
        payments: json.payments,
        notifications: json.notifications,
        updated_by_profile_id: actor.authUserId,
      },
    });
    await tx.store_brand_assets.deleteMany({ where: { kind: "store_logo" } });
    const logo = normalized.identity.logo;
    if (logo) {
      const assetData = {
        kind: "store_logo" as const,
        secure_url: logo.url,
        alt: `${normalized.identity.storeName || "Store"} logo`,
        width: logo.width,
        height: logo.height,
        format: logo.format,
        bytes: logo.bytes,
      };
      const asset = await tx.cloudinary_assets.upsert({
        where: { public_id: logo.publicId },
        update: assetData,
        create: { ...assetData, public_id: logo.publicId },
      });
      await tx.store_brand_assets.create({
        data: { asset_id: asset.id, kind: "store_logo", position: 0 },
      });
    }

    await tx.audit_events.create({
      data: {
        actor_profile_id: actor.authUserId,
        action: "settings.updated",
        target_table: "store_settings",
        metadata: {
          deliveryZoneCount: persistedZones.length,
          nationwideFallbackZoneId:
            normalized.delivery.zones.find(
              (zone) => zone.enabled && zone.isNationwideFallback,
            )?.id ?? null,
          pickupLocationCount: persistedPickups.length,
        },
      },
    });
    return ok({
      settings: mapStoreSettings(row, persistedZones, persistedPickups, logo),
      message: "Store settings saved.",
    });
  });
}

function mergeJsonObjects(
  existing: Prisma.JsonValue | null | undefined,
  next: Prisma.InputJsonValue,
): Prisma.InputJsonObject {
  return {
    ...(isJsonObject(existing) ? existing : {}),
    ...(isJsonObject(next) ? next : {}),
  } as Prisma.InputJsonObject;
}

function isJsonObject(
  value: Prisma.JsonValue | Prisma.InputJsonValue | null | undefined,
): value is Prisma.JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
