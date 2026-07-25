import "server-only";

import { err, ok, type Result } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
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
import type { StaffSession } from "@/server/auth/session";

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
    const existingZones = await tx.delivery_zones.findMany();
    const existingZoneIds = new Set(existingZones.map((zone) => zone.id));
    const persistedZones = [];
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
    const persistedPickups = [];
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
        zones: parsed.value.delivery.zones.map((zone, index) => ({
          ...zone,
          id: persistedZones[index]!.id,
        })),
        pickupLocations: parsed.value.delivery.pickupLocations.map((pickup, index) => ({
          ...pickup,
          id: persistedPickups[index]!.id,
        })),
      },
    };
    const json = settingsJsonInput(normalized);
    const row = await tx.store_settings.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        identity: json.identity,
        selling: json.selling,
        payments: json.payments,
        notifications: json.notifications,
        updated_by_profile_id: actor.authUserId,
      },
      update: {
        identity: json.identity,
        selling: json.selling,
        payments: json.payments,
        notifications: json.notifications,
        updated_by_profile_id: actor.authUserId,
      },
    });
    await tx.audit_events.create({
      data: {
        actor_profile_id: actor.authUserId,
        action: "settings.updated",
        target_table: "store_settings",
        metadata: {
          deliveryZoneCount: persistedZones.length,
          pickupLocationCount: persistedPickups.length,
        },
      },
    });
    return ok({
      settings: mapStoreSettings(row, persistedZones, persistedPickups),
      message: "Store settings saved.",
    });
  });
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
