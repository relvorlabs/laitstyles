import "server-only";

import { prisma } from "@/lib/prisma";
import { defaultStoreSettingsInput } from "@/lib/admin/settings/settings-defaults";
import { mapStoreSettings, settingsJsonInput } from "@/modules/settings/server/mappers";

export async function getStoreSettings() {
  return prisma.$transaction(async (tx) => {
    let row = await tx.store_settings.findUnique({ where: { id: 1 } });
    if (!row) {
      const json = settingsJsonInput(defaultStoreSettingsInput);
      row = await tx.store_settings.create({
        data: {
          id: 1,
          identity: json.identity,
          selling: json.selling,
          payments: json.payments,
          notifications: json.notifications,
        },
      });
    }

    const [zoneCount, pickupCount] = await Promise.all([
      tx.delivery_zones.count({ where: { position: { gte: 0 } } }),
      tx.pickup_locations.count({ where: { position: { gte: 0 } } }),
    ]);
    if (!zoneCount && !pickupCount) {
      await tx.delivery_zones.createMany({
        data: defaultStoreSettingsInput.delivery.zones.map((zone, position) => ({
          name: zone.name,
          city: zone.name,
          rate: zone.rate.toFixed(2),
          estimated_days:
            zone.estimatedMinDays === zone.estimatedMaxDays
              ? String(zone.estimatedMinDays)
              : `${zone.estimatedMinDays}-${zone.estimatedMaxDays}`,
          enabled: zone.enabled,
          position,
        })),
      });
      for (const [position, pickup] of defaultStoreSettingsInput.delivery.pickupLocations.entries()) {
        await tx.pickup_locations.create({
          data: {
            name: pickup.name,
            address: pickup.address,
            enabled: pickup.enabled,
            position,
          },
        });
      }
      const persistedPickups = await tx.pickup_locations.findMany({
        where: { position: { gte: 0 } },
        orderBy: { position: "asc" },
      });
      const json = settingsJsonInput({
        ...defaultStoreSettingsInput,
        delivery: {
          ...defaultStoreSettingsInput.delivery,
          pickupLocations: persistedPickups.map((persisted, index) => ({
            ...defaultStoreSettingsInput.delivery.pickupLocations[index]!,
            id: persisted.id,
          })),
        },
      });
      row = await tx.store_settings.update({
        where: { id: 1 },
        data: { selling: json.selling },
      });
    }

    const [zones, pickups] = await Promise.all([
      tx.delivery_zones.findMany({
        where: { position: { gte: 0 } },
        orderBy: { position: "asc" },
      }),
      tx.pickup_locations.findMany({
        where: { position: { gte: 0 } },
        orderBy: { position: "asc" },
      }),
    ]);
    return mapStoreSettings(row, zones, pickups);
  });
}
