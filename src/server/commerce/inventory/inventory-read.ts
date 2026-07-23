import "server-only";

import { prisma } from "@/lib/prisma";
import type { CatalogueTaxonomyItem } from "@/lib/admin/inventory/catalogue-taxonomy";
import type { InventoryProduct, StockMovement } from "@/lib/admin/inventory/inventory-types";
import {
  inventoryProductInclude,
  mapInventoryProductRow,
  mapStockMovementRow,
  mapTaxonomyRow,
} from "@/server/commerce/inventory/inventory-mappers";

const MAX_ADMIN_PRODUCTS = 500;
const MAX_STOCK_MOVEMENTS = 500;

export async function listInventoryProducts(): Promise<InventoryProduct[]> {
  const rows = await prisma.products.findMany({
    include: inventoryProductInclude,
    orderBy: { updated_at: "desc" },
    take: MAX_ADMIN_PRODUCTS,
  });
  return rows.map(mapInventoryProductRow);
}

export async function getInventoryProduct(productId: string): Promise<InventoryProduct | null> {
  const row = await prisma.products.findUnique({
    where: { id: productId },
    include: inventoryProductInclude,
  });
  return row ? mapInventoryProductRow(row) : null;
}

export async function listInventoryTaxonomy(): Promise<CatalogueTaxonomyItem[]> {
  const [categories, collections] = await Promise.all([
    prisma.catalogue_categories.findMany({ orderBy: { name: "asc" } }),
    prisma.catalogue_collections.findMany({ orderBy: { name: "asc" } }),
  ]);
  return [
    ...categories.map((row) => mapTaxonomyRow(row, "category")),
    ...collections.map((row) => mapTaxonomyRow(row, "collection")),
  ];
}

export async function listInventoryStockMovements(
  productId?: string,
): Promise<StockMovement[]> {
  const rows = await prisma.stock_movements.findMany({
    where: productId ? { product_id: productId } : {},
    include: { profiles: { select: { display_name: true } } },
    orderBy: { occurred_at: "desc" },
    take: MAX_STOCK_MOVEMENTS,
  });
  return rows.map(mapStockMovementRow);
}
