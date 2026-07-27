import "server-only";

import { defaultStoreSettingsInput } from "@/lib/admin/settings/settings-defaults";
import { prisma } from "@/lib/prisma";
import {
  mapStoreBrandLogo,
  mapStoreSettings,
  settingsJsonInput,
} from "@/modules/settings/server/mappers";

const storeLogoAssetSelect = {
  public_id: true,
  secure_url: true,
  delivery_url: true,
  width: true,
  height: true,
  format: true,
  bytes: true,
} as const;

export async function getStoreSettings() {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended('laitstyles-store-settings-bootstrap', 0))`;

    const defaults = settingsJsonInput(defaultStoreSettingsInput);
    let row = await tx.store_settings.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        identity: defaults.identity,
        selling: defaults.selling,
        payments: defaults.payments,
        notifications: defaults.notifications,
      },
      update: {},
    });

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

      for (const [
        position,
        pickup,
      ] of defaultStoreSettingsInput.delivery.pickupLocations.entries()) {
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
      const initialized = settingsJsonInput({
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
        data: { selling: initialized.selling },
      });
    }

    const [zones, pickups, logoAsset] = await Promise.all([
      tx.delivery_zones.findMany({
        where: { position: { gte: 0 } },
        orderBy: { position: "asc" },
      }),
      tx.pickup_locations.findMany({
        where: { position: { gte: 0 } },
        orderBy: { position: "asc" },
      }),
      tx.store_brand_assets.findFirst({
        where: { kind: "store_logo" },
        orderBy: { position: "asc" },
        include: { cloudinary_assets: { select: storeLogoAssetSelect } },
      }),
    ]);

    return mapStoreSettings(row, zones, pickups, mapStoreBrandLogo(logoAsset));
  });
}
