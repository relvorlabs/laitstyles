import type { Prisma } from "../../prisma/generated/prisma/index";
import type { ProductMeasurementRow, VariantMeasurementRow } from "./catalog-measurements";
import type { CatalogSnapshot } from "./catalog-snapshot";

function conflict(table: string, identity: string): never {
  throw new Error(`Preflight conflict: ${table} ${identity}.`);
}

function sameNullable(left: string | null, right: string | null): boolean {
  return left === right;
}

export async function assertNoCatalogTargetConflicts(
  tx: Prisma.TransactionClient,
  source: CatalogSnapshot,
  productMeasurements: readonly ProductMeasurementRow[],
  variantMeasurements: readonly VariantMeasurementRow[],
): Promise<void> {
  const categories = await tx.catalogue_categories.findMany({
    where: {
      OR: [
        { id: { in: source.catalogue_categories.map((row) => row.id) } },
        { slug: { in: source.catalogue_categories.map((row) => row.slug) } },
      ],
    },
    select: { id: true, slug: true },
  });
  const categoryById = new Map(source.catalogue_categories.map((row) => [row.id, row]));
  const categoryBySlug = new Map(source.catalogue_categories.map((row) => [row.slug, row]));
  for (const row of categories) {
    const byId = categoryById.get(row.id);
    const bySlug = categoryBySlug.get(row.slug);
    if (!byId || !bySlug || byId.id !== bySlug.id) conflict("catalogue category", `${row.id}/${row.slug}`);
  }

  const collections = await tx.catalogue_collections.findMany({
    where: {
      OR: [
        { id: { in: source.catalogue_collections.map((row) => row.id) } },
        { slug: { in: source.catalogue_collections.map((row) => row.slug) } },
      ],
    },
    select: { id: true, slug: true },
  });
  const collectionById = new Map(source.catalogue_collections.map((row) => [row.id, row]));
  const collectionBySlug = new Map(source.catalogue_collections.map((row) => [row.slug, row]));
  for (const row of collections) {
    const byId = collectionById.get(row.id);
    const bySlug = collectionBySlug.get(row.slug);
    if (!byId || !bySlug || byId.id !== bySlug.id) {
      conflict("catalogue collection", `${row.id}/${row.slug}`);
    }
  }

  const products = await tx.products.findMany({
    where: {
      OR: [
        { id: { in: source.products.map((row) => row.id) } },
        { slug: { in: source.products.map((row) => row.slug) } },
        { sku: { in: source.products.flatMap((row) => (row.sku ? [row.sku] : [])) } },
        {
          archive_number: {
            in: source.products.flatMap((row) => (row.archive_number ? [row.archive_number] : [])),
          },
        },
      ],
    },
    select: { id: true, slug: true, sku: true, archive_number: true },
  });
  const productById = new Map(source.products.map((row) => [row.id, row]));
  const productBySlug = new Map(source.products.map((row) => [row.slug, row]));
  const productBySku = new Map(source.products.flatMap((row) => (row.sku ? [[row.sku, row] as const] : [])));
  const productByArchive = new Map(
    source.products.flatMap((row) => (row.archive_number ? [[row.archive_number, row] as const] : [])),
  );
  for (const row of products) {
    const expected = productById.get(row.id);
    const slugMatch = productBySlug.get(row.slug);
    const skuMatch = row.sku ? productBySku.get(row.sku) : undefined;
    const archiveMatch = row.archive_number ? productByArchive.get(row.archive_number) : undefined;
    if (
      !expected ||
      slugMatch?.id !== row.id ||
      (row.sku !== null && skuMatch?.id !== row.id) ||
      (row.archive_number !== null && archiveMatch?.id !== row.id) ||
      expected.slug !== row.slug ||
      !sameNullable(expected.sku, row.sku) ||
      !sameNullable(expected.archive_number, row.archive_number)
    ) {
      conflict("product", `${row.id}/${row.slug}`);
    }
  }

  const variantIds = source.product_variants.map((row) => row.id);
  const variantSkus = source.product_variants.flatMap((row) => (row.sku ? [row.sku] : []));
  const variants = await tx.product_variants.findMany({
    where: {
      OR: [
        { id: { in: variantIds } },
        ...(variantSkus.length ? [{ sku: { in: variantSkus } }] : []),
      ],
    },
    select: { id: true, product_id: true, sku: true },
  });
  const variantById = new Map(source.product_variants.map((row) => [row.id, row]));
  const variantByKey = new Map(
    source.product_variants.flatMap((row) =>
      row.sku ? [[`${row.product_id}:${row.sku}`, row] as const] : [],
    ),
  );
  for (const row of variants) {
    const byId = variantById.get(row.id);
    const byKey = row.sku ? variantByKey.get(`${row.product_id}:${row.sku}`) : undefined;
    if (byId && byId.product_id === row.product_id && sameNullable(byId.sku, row.sku)) continue;
    if (byKey && byKey.id === row.id) continue;
    if (byId || byKey) conflict("product variant", `${row.id}/${row.product_id}/${row.sku ?? "null"}`);
  }

  const expectedAssets = source.cloudinary_assets.map((row) => ({
    id: row.id,
    public_id: `snapshot-${row.id}`,
  }));
  const assets = await tx.cloudinary_assets.findMany({
    where: {
      OR: [
        { id: { in: expectedAssets.map((row) => row.id) } },
        { public_id: { in: expectedAssets.map((row) => row.public_id) } },
      ],
    },
    select: { id: true, public_id: true },
  });
  const assetById = new Map(expectedAssets.map((row) => [row.id, row]));
  const assetByPublicId = new Map(expectedAssets.map((row) => [row.public_id, row]));
  for (const row of assets) {
    const byId = assetById.get(row.id);
    const byPublicId = assetByPublicId.get(row.public_id);
    if (!byId || !byPublicId || byId.id !== byPublicId.id) {
      conflict("cloudinary asset", `${row.id}/${row.public_id}`);
    }
  }

  const media = await tx.product_media.findMany({
    where: {
      OR: [
        { id: { in: source.product_media.map((row) => row.id) } },
        { product_id: { in: source.products.map((row) => row.id) } },
      ],
    },
    select: { id: true, product_id: true, variant_id: true, position: true },
  });
  const mediaById = new Map(source.product_media.map((row) => [row.id, row]));
  const mediaByKey = new Map(
    source.product_media.map((row) => [
      `${row.product_id}:${row.variant_id ?? "product"}:${row.position}`,
      row,
    ]),
  );
  for (const row of media) {
    const byId = mediaById.get(row.id);
    const byKey = mediaByKey.get(`${row.product_id}:${row.variant_id ?? "product"}:${row.position}`);
    if (
      byId &&
      byId.product_id === row.product_id &&
      sameNullable(byId.variant_id, row.variant_id) &&
      byId.position === row.position
    ) {
      continue;
    }
    if (byKey && byKey.id === row.id) continue;
    if (byId || byKey) conflict("product media", `${row.id}/${row.product_id}/${row.position}`);
  }

  const existingProductMeasurements = await tx.product_measurements.findMany({
    where: {
      OR: [
        { id: { in: productMeasurements.map((row) => row.id) } },
        { product_id: { in: source.products.map((row) => row.id) } },
      ],
    },
    select: { id: true, product_id: true, position: true },
  });
  const productMeasurementById = new Map(productMeasurements.map((row) => [row.id, row]));
  const productMeasurementByKey = new Map(
    productMeasurements.map((row) => [`${row.product_id}:${row.position}`, row]),
  );
  for (const row of existingProductMeasurements) {
    const byId = productMeasurementById.get(row.id);
    const byKey = productMeasurementByKey.get(`${row.product_id}:${row.position}`);
    if (byId && byId.product_id === row.product_id && byId.position === row.position) continue;
    if (byKey && byKey.id === row.id) continue;
    if (byId || byKey) conflict("product measurement", `${row.id}/${row.product_id}/${row.position}`);
  }

  const existingVariantMeasurements = await tx.product_variant_measurements.findMany({
    where: {
      OR: [
        { id: { in: variantMeasurements.map((row) => row.id) } },
        { variant_id: { in: source.product_variants.map((row) => row.id) } },
      ],
    },
    select: { id: true, variant_id: true, position: true },
  });
  const variantMeasurementById = new Map(variantMeasurements.map((row) => [row.id, row]));
  const variantMeasurementByKey = new Map(
    variantMeasurements.map((row) => [`${row.variant_id}:${row.position}`, row]),
  );
  for (const row of existingVariantMeasurements) {
    const byId = variantMeasurementById.get(row.id);
    const byKey = variantMeasurementByKey.get(`${row.variant_id}:${row.position}`);
    if (byId && byId.variant_id === row.variant_id && byId.position === row.position) continue;
    if (byKey && byKey.id === row.id) continue;
    if (byId || byKey) {
      conflict("variant measurement", `${row.id}/${row.variant_id}/${row.position}`);
    }
  }

  const stock = await tx.stock_levels.findMany({
    where: {
      OR: [
        { id: { in: source.stock_levels.map((row) => row.id) } },
        { product_id: { in: source.products.map((row) => row.id) } },
      ],
    },
    select: { id: true, product_id: true, variant_id: true },
  });
  const stockById = new Map(source.stock_levels.map((row) => [row.id, row]));
  const stockByKey = new Map(
    source.stock_levels.map((row) => [`${row.product_id}:${row.variant_id ?? "product"}`, row]),
  );
  for (const row of stock) {
    const byId = stockById.get(row.id);
    const byKey = stockByKey.get(`${row.product_id}:${row.variant_id ?? "product"}`);
    if (
      byId &&
      byId.product_id === row.product_id &&
      sameNullable(byId.variant_id, row.variant_id)
    ) {
      continue;
    }
    if (byKey && byKey.id === row.id) continue;
    if (byId || byKey) conflict("stock level", `${row.id}/${row.product_id}/${row.variant_id ?? "product"}`);
  }
}
