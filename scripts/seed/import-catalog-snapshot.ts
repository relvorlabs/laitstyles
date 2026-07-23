/**
 * One-time import of the legacy public storefront snapshot into the database,
 * making Postgres the single catalogue source of truth (migration Phase 2).
 *
 * Reads scripts/seed/storefront-catalog-snapshot.json (the former
 * public/assets/data/storefront-catalog.json) and inserts categories,
 * collections, products, variants, assets, media, channels, measurements and
 * stock levels. Idempotent: createMany + skipDuplicates, stable snapshot ids.
 *
 *   pnpm db:import:catalog
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";
import { Prisma, PrismaClient } from "../../prisma/generated/prisma/client";
import { prepareCatalogSnapshot, type CatalogSnapshot } from "./catalog-snapshot";

loadEnv({ path: ".env.local" });

const connectionString = process.env.DIRECT_URL;
if (!connectionString) {
  throw new Error("DIRECT_URL is not set (import requires a direct connection).");
}
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString, max: 2, connectionTimeoutMillis: 15_000 }),
});

const snapshotPath = join(__dirname, "storefront-catalog-snapshot.json");
const prepared = prepareCatalogSnapshot(JSON.parse(readFileSync(snapshotPath, "utf8")));
const snapshot = prepared.snapshot;
const date = (value: string) => new Date(value);
const dateOrNull = (value: string | null) => (value ? new Date(value) : null);

const MEDIA_KIND = {
  cover: "product_cover",
  detail: "product_detail",
  defect: "product_defect",
} as const;

async function assertNoPreflightConflicts(
  tx: Prisma.TransactionClient,
  source: CatalogSnapshot,
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
  const expectedCategories = new Map(source.catalogue_categories.map((row) => [row.id, row.slug]));
  const expectedCategoryIds = new Map(source.catalogue_categories.map((row) => [row.slug, row.id]));
  for (const row of categories) {
    if (
      expectedCategories.get(row.id) !== row.slug ||
      expectedCategoryIds.get(row.slug) !== row.id
    ) {
      throw new Error(`Preflight conflict: catalogue category ${row.id}/${row.slug}.`);
    }
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
  const expectedCollections = new Map(
    source.catalogue_collections.map((row) => [row.id, row.slug]),
  );
  const expectedCollectionIds = new Map(
    source.catalogue_collections.map((row) => [row.slug, row.id]),
  );
  for (const row of collections) {
    if (
      expectedCollections.get(row.id) !== row.slug ||
      expectedCollectionIds.get(row.slug) !== row.id
    ) {
      throw new Error(`Preflight conflict: catalogue collection ${row.id}/${row.slug}.`);
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
  const expectedById = new Map(source.products.map((row) => [row.id, row]));
  for (const row of products) {
    const expected = expectedById.get(row.id);
    if (
      !expected ||
      expected.slug !== row.slug ||
      expected.sku !== row.sku ||
      expected.archive_number !== row.archive_number
    ) {
      throw new Error(`Preflight conflict: product ${row.id}/${row.slug}.`);
    }
  }
}

async function main() {
  const imported = await prisma.$transaction(
    async (tx) => {
      await assertNoPreflightConflicts(tx, snapshot);

      await tx.catalogue_categories.createMany({
        data: snapshot.catalogue_categories.map((row, position) => ({
          id: row.id,
          slug: row.slug,
          name: row.name,
          image_url: row.image_url,
          position,
        })),
        skipDuplicates: true,
      });

      await tx.catalogue_collections.createMany({
        data: snapshot.catalogue_collections.map((row, position) => ({
          id: row.id,
          slug: row.slug,
          name: row.name,
          position,
        })),
        skipDuplicates: true,
      });

      await tx.products.createMany({
        data: snapshot.products.map((row) => ({
          id: row.id,
          category_id: row.category_id,
          collection_id: row.collection_id,
          slug: row.slug,
          name: row.name,
          description: row.description,
          inventory_mode: row.inventory_mode,
          brand: row.brand,
          price: row.price,
          reference_price: row.reference_price,
          lifecycle: row.lifecycle,
          publication: row.publication,
          low_stock_threshold: row.low_stock_threshold,
          archive_number: row.archive_number,
          sku: row.sku,
          condition: row.condition,
          size_label: row.size_label,
          colour: row.colour,
          material: row.material,
          fit: row.fit,
          style: row.style,
          care_instructions: row.care_instructions,
          flaw_notes: row.flaw_notes,
          scheduled_at: dateOrNull(row.scheduled_at),
          published_at: row.publication === "published" ? date(row.created_at) : null,
          created_at: date(row.created_at),
          updated_at: date(row.updated_at),
        })),
        skipDuplicates: true,
      });

      // Per-product variant position, preserving snapshot order.
      const variantPosition = new Map<string, number>();
      await tx.product_variants.createMany({
        data: snapshot.product_variants.map((row) => {
          const productId = row.product_id;
          const position = variantPosition.get(productId) ?? 0;
          variantPosition.set(productId, position + 1);
          return {
            id: row.id,
            product_id: productId,
            label: row.title,
            sku: row.sku,
            size: row.size_label,
            colour: row.colour,
            price: row.price_override,
            position,
            created_at: date(row.created_at),
          };
        }),
        skipDuplicates: true,
      });

      // Asset kind derives from the media rows referencing the asset.
      const assetKind = new Map<string, (typeof MEDIA_KIND)[keyof typeof MEDIA_KIND]>();
      for (const media of snapshot.product_media) {
        if (!assetKind.has(media.asset_id)) assetKind.set(media.asset_id, MEDIA_KIND[media.role]);
      }
      await tx.cloudinary_assets.createMany({
        data: snapshot.cloudinary_assets.map((row) => ({
          id: row.id,
          provider: "pexels",
          kind: assetKind.get(row.id) ?? "product_detail",
          // public_id must be unique; the snapshot asset id is the stable key.
          public_id: `snapshot-${row.id}`,
          secure_url: row.secure_url,
          delivery_url: row.delivery_url,
          width: row.width,
          height: row.height,
          alt: row.alt,
        })),
        skipDuplicates: true,
      });

      await tx.product_media.createMany({
        data: snapshot.product_media.map((row) => ({
          id: row.id,
          product_id: row.product_id,
          variant_id: row.variant_id,
          asset_id: row.asset_id,
          kind: MEDIA_KIND[row.role],
          position: row.position,
        })),
        skipDuplicates: true,
      });

      await tx.product_channels.createMany({
        data: snapshot.product_channels
          .filter((row) => row.channel === "storefront")
          .map((row) => ({ product_id: row.product_id, channel: "storefront" as const })),
        skipDuplicates: true,
      });

      // The DB tracks product-level measurements only (no variant/unit columns):
      // fold the unit into the value and re-sequence positions per product.
      const measurementPosition = new Map<string, number>();
      await tx.product_measurements.createMany({
        data: snapshot.product_measurements
          .filter((row) => row.variant_id === null)
          .map((row) => {
            const position = measurementPosition.get(row.product_id) ?? 0;
            measurementPosition.set(row.product_id, position + 1);
            return {
              id: row.id,
              product_id: row.product_id,
              label: row.label,
              value: `${row.value} ${row.unit}`,
              position,
            };
          }),
        skipDuplicates: true,
      });

      await tx.stock_levels.createMany({
        data: snapshot.stock_levels.map((row) => ({
          id: row.id,
          product_id: row.product_id,
          variant_id: row.variant_id,
          total_received: row.quantity_on_hand,
          available: row.quantity_available,
          reserved: row.quantity_reserved,
          updated_at: date(row.updated_at),
        })),
        skipDuplicates: true,
      });

      const [products, variants, media, stock, measurements] = await Promise.all([
        tx.products.count({ where: { id: { in: snapshot.products.map((row) => row.id) } } }),
        tx.product_variants.count({
          where: { id: { in: snapshot.product_variants.map((row) => row.id) } },
        }),
        tx.product_media.count({
          where: { id: { in: snapshot.product_media.map((row) => row.id) } },
        }),
        tx.stock_levels.count({
          where: { id: { in: snapshot.stock_levels.map((row) => row.id) } },
        }),
        tx.product_measurements.count({
          where: {
            id: {
              in: snapshot.product_measurements
                .filter((row) => row.variant_id === null)
                .map((row) => row.id),
            },
          },
        }),
      ]);
      const expected = {
        products: snapshot.products.length,
        variants: snapshot.product_variants.length,
        media: snapshot.product_media.length,
        stock: snapshot.stock_levels.length,
        measurements: prepared.counts.importedMeasurements,
      };
      const actual = { products, variants, media, stock, measurements };
      if (
        Object.keys(expected).some(
          (key) => expected[key as keyof typeof expected] !== actual[key as keyof typeof actual],
        )
      ) {
        throw new Error(
          `Post-import count mismatch: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`,
        );
      }
      return { products, variants, media, stock, measurements };
    },
    { maxWait: 15_000, timeout: 60_000 },
  );

  console.warn(
    `Imported snapshot: ${imported.products} products, ${imported.variants} variants, ${imported.media} media rows, ${imported.stock} stock rows, ${imported.measurements} measurements.`,
  );
  console.warn(
    `Snapshot adjustments: ${prepared.counts.normalizedDuplicateSkus} duplicate variant SKUs set to null; ${prepared.counts.droppedVariantMeasurements} variant measurements omitted because the database model has no variant measurement relation.`,
  );
}

main()
  .catch((error) => {
    console.error("IMPORT_FAILED:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
