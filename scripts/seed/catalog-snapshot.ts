import { z } from "zod";

const uuid = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "Expected UUID");
const isoDate = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), "Expected valid date");
const nullableString = z.string().nullable();
const nullableNumber = z.number().finite().nonnegative().nullable();

const categorySchema = z.object({
  id: uuid,
  slug: z.string().min(1),
  name: z.string().min(1),
  image_url: z.string().min(1),
});
const collectionSchema = z.object({ id: uuid, slug: z.string().min(1), name: z.string().min(1) });
const productSchema = z.object({
  id: uuid,
  category_id: uuid.nullable(),
  collection_id: uuid.nullable(),
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  inventory_mode: z.enum(["unique", "stocked", "variant"]),
  brand: nullableString,
  price: z.number().finite().nonnegative(),
  reference_price: nullableNumber,
  lifecycle: z.enum(["draft", "intake", "active", "archived"]),
  publication: z.enum(["published", "unpublished", "scheduled"]),
  low_stock_threshold: z.number().int().nonnegative(),
  archive_number: nullableString,
  sku: nullableString,
  condition: nullableString,
  size_label: nullableString,
  colour: nullableString,
  material: nullableString,
  fit: nullableString,
  style: nullableString,
  care_instructions: nullableString,
  flaw_notes: nullableString,
  scheduled_at: isoDate.nullable(),
  created_at: isoDate,
  updated_at: isoDate,
});
const variantSchema = z.object({
  id: uuid,
  product_id: uuid,
  title: z.string().min(1),
  sku: nullableString,
  size_label: nullableString,
  colour: nullableString,
  price_override: nullableNumber,
  created_at: isoDate,
});
const stockSchema = z.object({
  id: uuid,
  product_id: uuid,
  variant_id: uuid.nullable(),
  quantity_on_hand: z.number().int().nonnegative(),
  quantity_available: z.number().int().nonnegative(),
  quantity_reserved: z.number().int().nonnegative(),
  updated_at: isoDate,
});
const measurementSchema = z.object({
  id: uuid,
  product_id: uuid,
  variant_id: uuid.nullable(),
  label: z.string().min(1),
  value: z.number().finite().nonnegative(),
  unit: z.string().min(1),
});
const assetSchema = z.object({
  id: uuid,
  secure_url: z.string().min(1),
  delivery_url: nullableString,
  width: z.number().int().nonnegative().nullable(),
  height: z.number().int().nonnegative().nullable(),
  alt: z.string(),
});
const mediaSchema = z.object({
  id: uuid,
  product_id: uuid,
  variant_id: uuid.nullable(),
  asset_id: uuid,
  role: z.enum(["cover", "detail", "defect"]),
  position: z.number().int().nonnegative(),
});
const snapshotSchema = z.object({
  schema_version: z.literal(2),
  catalogue_categories: z.array(categorySchema),
  catalogue_collections: z.array(collectionSchema),
  products: z.array(productSchema),
  product_channels: z.array(
    z.object({
      product_id: uuid,
      channel: z.enum(["storefront", "physical-store", "whatsapp", "instagram"]),
    }),
  ),
  product_variants: z.array(variantSchema),
  stock_levels: z.array(stockSchema),
  product_measurements: z.array(measurementSchema),
  cloudinary_assets: z.array(assetSchema),
  product_media: z.array(mediaSchema),
});

export type CatalogSnapshot = z.infer<typeof snapshotSchema>;
export type PreparedCatalogSnapshot = {
  snapshot: CatalogSnapshot;
  counts: {
    importedMeasurements: number;
    importedVariantMeasurements: number;
    droppedVariantMeasurements: number;
  };
};

function fail(path: string, message: string): never {
  throw new Error(`Invalid catalogue snapshot at ${path}: ${message}`);
}

function assertUnique<T>(rows: T[], path: string, key: (row: T) => string | null): void {
  const seen = new Set<string>();
  for (const row of rows) {
    const value = key(row);
    if (value === null) continue;
    if (seen.has(value)) fail(path, `duplicate ${path} value "${value}"`);
    seen.add(value);
  }
}

function assertForeignKey(id: string | null, ids: Set<string>, path: string): void {
  if (id !== null && !ids.has(id)) fail(path, `references missing row "${id}"`);
}

export function prepareCatalogSnapshot(input: unknown): PreparedCatalogSnapshot {
  const parsed = snapshotSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new Error(`Invalid catalogue snapshot at ${issue.path.join(".")}: ${issue.message}`);
  }

  const snapshot = parsed.data;
  assertUnique(snapshot.catalogue_categories, "catalogue_categories.id", (row) => row.id);
  assertUnique(snapshot.catalogue_categories, "catalogue_categories.slug", (row) => row.slug);
  assertUnique(snapshot.catalogue_collections, "catalogue_collections.id", (row) => row.id);
  assertUnique(snapshot.catalogue_collections, "catalogue_collections.slug", (row) => row.slug);
  assertUnique(snapshot.products, "products.id", (row) => row.id);
  assertUnique(snapshot.products, "products.slug", (row) => row.slug);
  assertUnique(snapshot.products, "products.sku", (row) => row.sku);
  assertUnique(snapshot.products, "products.archive_number", (row) => row.archive_number);
  assertUnique(snapshot.product_variants, "product_variants.id", (row) => row.id);
  assertUnique(snapshot.product_variants, "product_variants.product_id+sku", (row) =>
    row.sku === null ? null : `${row.product_id}:${row.sku}`,
  );
  assertUnique(snapshot.stock_levels, "stock_levels.id", (row) => row.id);
  assertUnique(snapshot.product_measurements, "product_measurements.id", (row) => row.id);
  assertUnique(snapshot.cloudinary_assets, "cloudinary_assets.id", (row) => row.id);
  assertUnique(snapshot.product_media, "product_media.id", (row) => row.id);

  const categoryIds = new Set(snapshot.catalogue_categories.map((row) => row.id));
  const collectionIds = new Set(snapshot.catalogue_collections.map((row) => row.id));
  const productIds = new Set(snapshot.products.map((row) => row.id));
  const assetIds = new Set(snapshot.cloudinary_assets.map((row) => row.id));
  const variantById = new Map(snapshot.product_variants.map((row) => [row.id, row]));

  for (const product of snapshot.products) {
    assertForeignKey(product.category_id, categoryIds, `products.${product.id}.category_id`);
    assertForeignKey(product.collection_id, collectionIds, `products.${product.id}.collection_id`);
  }
  for (const channel of snapshot.product_channels) {
    assertForeignKey(channel.product_id, productIds, `product_channels.${channel.product_id}.product_id`);
  }
  for (const variant of snapshot.product_variants) {
    assertForeignKey(variant.product_id, productIds, `product_variants.${variant.id}.product_id`);
  }
  for (const stock of snapshot.stock_levels) {
    assertForeignKey(stock.product_id, productIds, `stock_levels.${stock.id}.product_id`);
    if (stock.quantity_available + stock.quantity_reserved > stock.quantity_on_hand) {
      fail(`stock_levels.${stock.id}`, "available plus reserved exceeds quantity_on_hand");
    }
    if (stock.variant_id !== null) {
      const variant = variantById.get(stock.variant_id);
      if (!variant) fail(`stock_levels.${stock.id}.variant_id`, "references missing variant");
      if (variant.product_id !== stock.product_id) {
        fail(`stock_levels.${stock.id}.variant_id`, "variant and stock must belong to the same product");
      }
    }
  }
  for (const measurement of snapshot.product_measurements) {
    assertForeignKey(measurement.product_id, productIds, `product_measurements.${measurement.id}.product_id`);
    if (measurement.variant_id !== null) {
      const variant = variantById.get(measurement.variant_id);
      if (!variant) {
        fail(`product_measurements.${measurement.id}.variant_id`, "references missing variant");
      }
      if (variant.product_id !== measurement.product_id) {
        fail(
          `product_measurements.${measurement.id}.variant_id`,
          "variant and measurement must belong to the same product",
        );
      }
    }
  }
  for (const media of snapshot.product_media) {
    assertForeignKey(media.product_id, productIds, `product_media.${media.id}.product_id`);
    assertForeignKey(media.asset_id, assetIds, `product_media.${media.id}.asset_id`);
    if (media.variant_id !== null) {
      const variant = variantById.get(media.variant_id);
      if (!variant) fail(`product_media.${media.id}.variant_id`, "references missing variant");
      if (variant.product_id !== media.product_id) {
        fail(`product_media.${media.id}.variant_id`, "variant and media must belong to the same product");
      }
    }
  }

  for (const product of snapshot.products) {
    const variants = snapshot.product_variants.filter((row) => row.product_id === product.id);
    const productStock = snapshot.stock_levels.filter(
      (row) => row.product_id === product.id && row.variant_id === null,
    );
    const variantStock = snapshot.stock_levels.filter(
      (row) => row.product_id === product.id && row.variant_id !== null,
    );
    if (product.inventory_mode === "variant") {
      if (
        variants.length === 0 ||
        productStock.length !== 0 ||
        variantStock.length !== variants.length
      ) {
        fail(
          `products.${product.id}.inventory_mode`,
          "variant stock must have one row per variant and no product-level row",
        );
      }
    } else {
      if (variants.length !== 0 || variantStock.length !== 0 || productStock.length !== 1) {
        fail(
          `products.${product.id}.inventory_mode`,
          `${product.inventory_mode} stock must have one product-level row and no variants`,
        );
      }
      if (product.inventory_mode === "unique" && productStock[0].quantity_on_hand > 1) {
        fail(`products.${product.id}.inventory_mode`, "unique product quantity cannot exceed one");
      }
    }
  }

  const importedVariantMeasurements = snapshot.product_measurements.filter(
    (row) => row.variant_id !== null,
  ).length;

  return {
    snapshot,
    counts: {
      importedMeasurements: snapshot.product_measurements.length,
      importedVariantMeasurements,
      droppedVariantMeasurements: 0,
    },
  };
}
