import "server-only";

import type { Prisma } from "@/lib/prisma";
import type { CatalogueTaxonomyKind } from "@/lib/admin/inventory/catalogue-taxonomy";
import type { ProductEditorValues } from "@/lib/admin/product-editor/product-editor-types";
import type { StaffSession } from "@/server/auth/session";
import type { inventoryProductInclude } from "@/server/commerce/inventory/inventory-mappers";
import {
  clean,
  InventoryRuleViolation,
  isUuid,
  slugify,
} from "@/server/commerce/inventory/inventory-rules";

type StockBalance = {
  id: string;
  total_received: number;
  available: number;
  reserved: number;
  committed: number;
  sold: number;
  returned: number;
  damaged: number;
};

type ExistingProductRow = Prisma.productsGetPayload<{
  include: typeof inventoryProductInclude;
}>;

const mediaKindToDb = {
  cover: "product_cover",
  detail: "product_detail",
  defect: "product_defect",
} as const;

const channelToDb = {
  storefront: "storefront",
  "physical-store": "physical_store",
  whatsapp: "whatsapp",
  instagram: "instagram",
} as const;

export async function resolveTaxonomyId(
  tx: Prisma.TransactionClient,
  kind: CatalogueTaxonomyKind,
  value: string,
): Promise<string | null> {
  const name = clean(value);
  if (!name || name === "Uncategorised") return null;
  const slug = slugify(name);
  if (kind === "category") {
    return (
      await tx.catalogue_categories.upsert({
        where: { slug },
        update: { name },
        create: { slug, name },
      })
    ).id;
  }
  return (
    await tx.catalogue_collections.upsert({
      where: { slug },
      update: { name },
      create: { slug, name },
    })
  ).id;
}

function protectedQuantity(stock: StockBalance | undefined): number {
  if (!stock) return 0;
  return stock.reserved + stock.committed + stock.sold + stock.returned + stock.damaged;
}

function nextStockData(stock: StockBalance | undefined, totalReceived: number) {
  const protectedUnits = protectedQuantity(stock);
  if (totalReceived < protectedUnits) {
    throw new InventoryRuleViolation({
      code: "validation-failed",
      message: `Total received cannot be lower than ${protectedUnits}, because those units are already committed.`,
      issues: [
        {
          path: "stock",
          message: `Total received cannot be lower than ${protectedUnits}.`,
          step: "stock",
        },
      ],
    });
  }
  return {
    total_received: totalReceived,
    available: totalReceived - protectedUnits,
    reserved: stock?.reserved ?? 0,
    committed: stock?.committed ?? 0,
    sold: stock?.sold ?? 0,
    returned: stock?.returned ?? 0,
    damaged: stock?.damaged ?? 0,
  };
}

async function assertVariantsCanBeRemoved(
  tx: Prisma.TransactionClient,
  productId: string,
  variantIds: string[],
): Promise<void> {
  if (!variantIds.length) return;
  const [holds, lines, movements] = await Promise.all([
    tx.holds.count({ where: { product_id: productId, variant_id: { in: variantIds } } }),
    tx.order_lines.count({ where: { product_id: productId, variant_id: { in: variantIds } } }),
    tx.stock_movements.count({ where: { product_id: productId, variant_id: { in: variantIds } } }),
  ]);
  if (holds + lines + movements > 0) {
    throw new InventoryRuleViolation({
      code: "validation-failed",
      message:
        "One or more removed variants have hold, order or stock history. Keep those variants and archive the product instead.",
      issues: [
        {
          path: "variant.variants",
          message: "Referenced variants cannot be removed.",
          step: "stock",
        },
      ],
    });
  }
}

export async function writeProductMedia(
  tx: Prisma.TransactionClient,
  productId: string,
  media: ProductEditorValues["media"],
): Promise<void> {
  await tx.product_media.deleteMany({ where: { product_id: productId } });
  for (const [position, item] of media.entries()) {
    const kind = mediaKindToDb[item.kind];
    const asset = await tx.cloudinary_assets.upsert({
      where: { public_id: `admin/products/${productId}/${position}` },
      update: { kind, secure_url: item.url, alt: clean(item.alt) },
      create: {
        kind,
        public_id: `admin/products/${productId}/${position}`,
        secure_url: item.url,
        alt: clean(item.alt),
      },
    });
    await tx.product_media.create({
      data: { product_id: productId, asset_id: asset.id, kind, position },
    });
  }
}

export async function writeChannels(
  tx: Prisma.TransactionClient,
  productId: string,
  channels: ProductEditorValues["channels"],
): Promise<void> {
  await tx.product_channels.deleteMany({ where: { product_id: productId } });
  if (!channels.length) return;
  await tx.product_channels.createMany({
    data: channels.map((channel) => ({
      product_id: productId,
      channel: channelToDb[channel],
    })),
  });
}

export async function writeMeasurements(
  tx: Prisma.TransactionClient,
  productId: string,
  values: ProductEditorValues,
): Promise<void> {
  await tx.product_measurements.deleteMany({ where: { product_id: productId } });
  if (values.inventoryMode !== "unique" || !values.unique.measurements.length) return;
  await tx.product_measurements.createMany({
    data: values.unique.measurements.map((measurement, position) => ({
      product_id: productId,
      label: clean(measurement.label),
      value: clean(measurement.value),
      position,
    })),
  });
}

async function recordStockMovement(
  tx: Prisma.TransactionClient,
  actorProfileId: string,
  productId: string,
  variantId: string | null,
  previousTotal: number,
  nextTotal: number,
): Promise<void> {
  const difference = nextTotal - previousTotal;
  if (difference === 0) return;
  await tx.stock_movements.create({
    data: {
      product_id: productId,
      variant_id: variantId,
      kind: previousTotal === 0 && difference > 0 ? "received" : "adjusted",
      quantity: difference,
      actor_profile_id: actorProfileId,
      note:
        previousTotal === 0 && difference > 0
          ? "Initial stock recorded through the product editor."
          : "Stock total adjusted through the product editor.",
    },
  });
}

export async function writeStockAndVariants(
  tx: Prisma.TransactionClient,
  actor: StaffSession,
  productId: string,
  values: ProductEditorValues,
  existingRow: ExistingProductRow | null,
): Promise<void> {
  const existingVariants = new Map(
    (existingRow?.product_variants ?? []).map((variant) => [variant.id, variant]),
  );
  const existingProductStock = existingRow?.stock_levels.find((stock) => stock.variant_id === null);

  if (values.inventoryMode !== "variant") {
    const removedVariantIds = [...existingVariants.keys()];
    await assertVariantsCanBeRemoved(tx, productId, removedVariantIds);
    if (removedVariantIds.length) {
      await tx.stock_levels.deleteMany({
        where: { product_id: productId, variant_id: { in: removedVariantIds } },
      });
      await tx.product_variants.deleteMany({
        where: { product_id: productId, id: { in: removedVariantIds } },
      });
    }

    const totalReceived = values.inventoryMode === "unique" ? 1 : values.stocked.quantity;
    const data = nextStockData(existingProductStock, totalReceived);
    if (existingProductStock) {
      await tx.stock_levels.update({ where: { id: existingProductStock.id }, data });
    } else {
      await tx.stock_levels.create({ data: { product_id: productId, ...data } });
    }
    await recordStockMovement(
      tx,
      actor.authUserId,
      productId,
      null,
      existingProductStock?.total_received ?? 0,
      totalReceived,
    );
    return;
  }

  if (existingProductStock) {
    await tx.stock_levels.delete({ where: { id: existingProductStock.id } });
  }

  const retainedIds = new Set(
    values.variant.variants
      .map((variant) => variant.id)
      .filter((id) => isUuid(id) && existingVariants.has(id)),
  );
  const removedVariantIds = [...existingVariants.keys()].filter((id) => !retainedIds.has(id));
  await assertVariantsCanBeRemoved(tx, productId, removedVariantIds);
  if (removedVariantIds.length) {
    await tx.stock_levels.deleteMany({
      where: { product_id: productId, variant_id: { in: removedVariantIds } },
    });
    await tx.product_variants.deleteMany({
      where: { product_id: productId, id: { in: removedVariantIds } },
    });
  }

  for (const [position, input] of values.variant.variants.entries()) {
    const existing = isUuid(input.id) ? existingVariants.get(input.id) : undefined;
    const variantData = {
      label: clean(input.label),
      sku: clean(input.sku) || null,
      size: clean(input.size) || null,
      colour: clean(input.colour) || null,
      price: input.price === null ? null : input.price.toFixed(2),
      cost: input.cost === null ? null : input.cost.toFixed(2),
      position,
    };
    const variant = existing
      ? await tx.product_variants.update({ where: { id: existing.id }, data: variantData })
      : await tx.product_variants.create({
          data: { product_id: productId, ...variantData },
        });

    const stock = existing?.stock_levels[0];
    const nextData = nextStockData(stock, input.quantity);
    if (stock) {
      await tx.stock_levels.update({ where: { id: stock.id }, data: nextData });
    } else {
      await tx.stock_levels.create({
        data: { product_id: productId, variant_id: variant.id, ...nextData },
      });
    }

    await recordStockMovement(
      tx,
      actor.authUserId,
      productId,
      variant.id,
      stock?.total_received ?? 0,
      input.quantity,
    );

    if (clean(input.imageUrl)) {
      const asset = await tx.cloudinary_assets.upsert({
        where: { public_id: `admin/products/${productId}/variants/${variant.id}` },
        update: {
          kind: "product_detail",
          secure_url: clean(input.imageUrl),
          alt: `${clean(values.name) || "Product"} — ${clean(input.label)}`,
        },
        create: {
          kind: "product_detail",
          public_id: `admin/products/${productId}/variants/${variant.id}`,
          secure_url: clean(input.imageUrl),
          alt: `${clean(values.name) || "Product"} — ${clean(input.label)}`,
        },
      });
      await tx.product_media.create({
        data: {
          product_id: productId,
          variant_id: variant.id,
          asset_id: asset.id,
          kind: "product_detail",
          position: 0,
        },
      });
    }
  }
}
