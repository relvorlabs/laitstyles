import "server-only";

import type {
  ProductEditorActionError,
  ProductEditorValues,
} from "@/lib/admin/product-editor/product-editor-types";
import type { Prisma } from "@/lib/prisma";
import type { StaffSession } from "@/server/auth/session";

export type StockBalance = {
  id: string;
  variant_id: string | null;
  total_received: number;
  available: number;
  reserved: number;
  committed: number;
  sold: number;
  returned: number;
  damaged: number;
};

type ExistingInventoryVariant = {
  id: string;
  stock_levels: StockBalance[];
};

export type ExistingProductInventoryState = {
  inventory_mode: string;
  stock_levels: StockBalance[];
  product_variants: ExistingInventoryVariant[];
};

export class InventoryRuleViolation extends Error {
  constructor(readonly actionError: ProductEditorActionError) {
    super(actionError.message);
  }
}

function cleanText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function assetProviderFor(url: string): string {
  try {
    return new URL(url).hostname === "res.cloudinary.com" ? "cloudinary" : "external";
  } catch {
    return "external";
  }
}

function protectedQuantity(stock: StockBalance | undefined): number {
  if (!stock) return 0;
  return stock.reserved + stock.committed + stock.sold + stock.returned + stock.damaged;
}

function recordedQuantity(stock: StockBalance | undefined): number {
  if (!stock) return 0;
  return (
    stock.total_received +
    stock.available +
    stock.reserved +
    stock.committed +
    stock.sold +
    stock.returned +
    stock.damaged
  );
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

export async function assertProductInventoryModeCanChange(
  tx: Prisma.TransactionClient,
  productId: string,
  existingRow: ExistingProductInventoryState | null,
  nextMode: ProductEditorValues["inventoryMode"],
): Promise<void> {
  if (!existingRow || existingRow.inventory_mode === nextMode) return;

  const stockRows = [
    ...existingRow.stock_levels,
    ...existingRow.product_variants.flatMap((variant) => variant.stock_levels),
  ];
  const hasRecordedBalance = stockRows.some((stock) => recordedQuantity(stock) > 0);
  const [holds, lines, movements] = await Promise.all([
    tx.holds.count({ where: { product_id: productId } }),
    tx.order_lines.count({ where: { product_id: productId } }),
    tx.stock_movements.count({ where: { product_id: productId } }),
  ]);

  if (!hasRecordedBalance && holds + lines + movements === 0) return;

  throw new InventoryRuleViolation({
    code: "validation-failed",
    message:
      "Product type cannot change after stock or operational history has been recorded. Archive this product and create a new record instead.",
    issues: [
      {
        path: "inventoryMode",
        message: "Product type is locked after stock or operational history exists.",
        step: "type",
      },
    ],
  });
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

export async function writeProductStockAndVariants(
  tx: Prisma.TransactionClient,
  actor: StaffSession,
  productId: string,
  values: ProductEditorValues,
  existingRow: ExistingProductInventoryState | null,
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
      label: cleanText(input.label),
      sku: cleanText(input.sku) || null,
      size: cleanText(input.size) || null,
      colour: cleanText(input.colour) || null,
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

    if (cleanText(input.imageUrl)) {
      const imageUrl = cleanText(input.imageUrl);
      const provider = assetProviderFor(imageUrl);
      const asset = await tx.cloudinary_assets.upsert({
        where: { public_id: `admin/products/${productId}/variants/${variant.id}` },
        update: {
          provider,
          kind: "product_detail",
          secure_url: imageUrl,
          alt: `${cleanText(values.name) || "Product"} — ${cleanText(input.label)}`,
        },
        create: {
          provider,
          kind: "product_detail",
          public_id: `admin/products/${productId}/variants/${variant.id}`,
          secure_url: imageUrl,
          alt: `${cleanText(values.name) || "Product"} — ${cleanText(input.label)}`,
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
