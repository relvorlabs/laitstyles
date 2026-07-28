import "server-only";

import type { ApiPaginationMeta } from "@/lib/http/contracts";
import { prisma } from "@/lib/prisma";
import {
  adminProductInclude,
  categoryTaxonomyInclude,
  collectionTaxonomyInclude,
  mapAdminProductRow,
  mapProductTaxonomyRow,
} from "@/modules/products/server/mappers";
import type { AdminProduct, ProductTaxonomyItem } from "@/modules/products/types";

export type AdminProductListInput = {
  page: number;
  pageSize: number;
};

export type AdminProductListResult = {
  data: AdminProduct[];
  meta: ApiPaginationMeta;
};

export async function listAdminProducts({
  page,
  pageSize,
}: AdminProductListInput): Promise<AdminProductListResult> {
  const [rows, total] = await prisma.$transaction([
    prisma.products.findMany({
      include: adminProductInclude,
      orderBy: { updated_at: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.products.count(),
  ]);

  return {
    data: rows.map(mapAdminProductRow),
    meta: {
      page,
      pageSize,
      total,
      pageCount: Math.ceil(total / pageSize),
    },
  };
}

export async function getAdminProductsByIds(productIds: string[]): Promise<AdminProduct[]> {
  if (!productIds.length) return [];
  const rows = await prisma.products.findMany({
    where: { id: { in: productIds } },
    include: adminProductInclude,
  });
  const byId = new Map(rows.map((row) => [row.id, mapAdminProductRow(row)]));
  return productIds.flatMap((id) => {
    const product = byId.get(id);
    return product ? [product] : [];
  });
}

export async function getAdminProduct(productId: string): Promise<AdminProduct | null> {
  const row = await prisma.products.findUnique({
    where: { id: productId },
    include: adminProductInclude,
  });
  return row ? mapAdminProductRow(row) : null;
}

export async function listProductTaxonomy(): Promise<ProductTaxonomyItem[]> {
  const [categories, collections] = await Promise.all([
    prisma.catalogue_categories.findMany({
      include: categoryTaxonomyInclude,
      orderBy: [{ position: "asc" }, { name: "asc" }],
    }),
    prisma.catalogue_collections.findMany({
      include: collectionTaxonomyInclude,
      orderBy: [{ position: "asc" }, { name: "asc" }],
    }),
  ]);
  return [
    ...categories.map((row) => mapProductTaxonomyRow(row, "category")),
    ...collections.map((row) => mapProductTaxonomyRow(row, "collection")),
  ];
}
