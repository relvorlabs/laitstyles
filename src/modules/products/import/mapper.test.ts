import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { mapProductImport } from "@/modules/products/import/mapper";
import type { ProductImportRow } from "@/modules/products/import/types";

const CATEGORY_ID = "category-1";
const COLLECTION_ID = "collection-1";
const PRODUCT_ID = "product-1";
const VARIANT_ID = "variant-1";

function snapshotFixture(overrides: Record<string, unknown> = {}) {
  return {
    catalogue_categories: [{ id: CATEGORY_ID, name: "Jackets" }],
    catalogue_collections: [{ id: COLLECTION_ID, name: "After dark" }],
    products: [
      {
        id: PRODUCT_ID,
        category_id: CATEGORY_ID,
        collection_id: COLLECTION_ID,
        name: "Archive jacket",
        description: "A detailed archive jacket.",
        inventory_mode: "variant",
        brand: "Laitstyles Curated",
        price: 46500,
        reference_price: 57000,
        low_stock_threshold: 3,
        sku: "ARCHIVE-JACKET",
        condition: null,
        size_label: null,
        colour: "Black",
        material: "Wool",
        fit: "Relaxed",
        style: "Collegiate",
        care_instructions: "Dry clean.",
        flaw_notes: "",
        weight_grams: 900,
        pickup_available: true,
        delivery_restrictions: "No express delivery.",
        packaging_notes: "Use a garment bag.",
        scheduled_at: null,
      },
    ],
    product_channels: [
      { product_id: PRODUCT_ID, channel: "storefront" },
      { product_id: PRODUCT_ID, channel: "physical_store" },
    ],
    product_variants: [
      {
        id: VARIANT_ID,
        product_id: PRODUCT_ID,
        title: "Black / M",
        sku: "ARCHIVE-JACKET-M",
        size_label: "M",
        colour: "Black",
        price_override: 48000,
        cost: 19000,
      },
    ],
    stock_levels: [
      {
        product_id: PRODUCT_ID,
        variant_id: VARIANT_ID,
        quantity_on_hand: 2,
      },
      {
        product_id: PRODUCT_ID,
        variant_id: VARIANT_ID,
        quantity_on_hand: 3,
      },
    ],
    product_measurements: [
      { product_id: PRODUCT_ID, variant_id: null, label: "Chest", value: 58.4, unit: "cm" },
    ],
    product_media: [
      { product_id: PRODUCT_ID, variant_id: null, asset_id: "asset-product" },
      { product_id: PRODUCT_ID, variant_id: VARIANT_ID, asset_id: "asset-variant" },
    ],
    cloudinary_assets: [{ id: "asset-product" }, { id: "asset-variant" }],
    ...overrides,
  };
}

describe("mapProductImport", () => {
  it("maps direct rows into editor drafts for every inventory mode", () => {
    const rows: ProductImportRow[] = [
      {
        mode: "unique",
        name: "Archive coat",
        condition: "Excellent",
        size: "M",
        colour: "Black",
        measurements: [{ label: "Chest", value: "52 cm" }],
      },
      {
        mode: "stocked",
        name: "Cotton tee",
        sizeLabel: "L",
        colour: "White",
        stock: 4,
      },
      {
        mode: "variant",
        name: "Varsity jacket",
        optionNames: ["Size"],
        variants: [{ label: "S", sku: "VARSITY-S", size: "S", stock: 2 }],
        measurements: [],
      },
    ];

    const result = mapProductImport(rows);

    expect(result.children).toHaveLength(3);
    expect(result.children).toMatchObject([
      {
        importId: "direct-1",
        values: {
          productId: null,
          inventoryMode: "unique",
          media: [],
          unique: { measurements: [{ id: "direct-1-measurement-1", label: "Chest" }] },
        },
      },
      {
        importId: "direct-2",
        values: { productId: null, inventoryMode: "stocked", stocked: { quantity: 4 } },
      },
      {
        importId: "direct-3",
        values: {
          productId: null,
          inventoryMode: "variant",
          variant: {
            variants: [expect.objectContaining({ id: "direct-3-variant-1", image: null })],
          },
        },
      },
    ]);
    expect(result.ignoredAssetCount).toBe(0);
  });

  it("joins relational taxonomy, channels, stock, measurements, pricing and fulfilment", () => {
    const result = mapProductImport(snapshotFixture());

    expect(result.children[0]).toMatchObject({
      importId: "import-product-1",
      values: {
        productId: null,
        inventoryMode: "variant",
        category: "Jackets",
        collection: "After dark",
        sellingPrice: 46500,
        referencePrice: 57000,
        channels: ["storefront", "physical-store"],
        fulfilment: { weightKg: 0.9, pickupAvailable: true },
        variant: {
          variants: [
            expect.objectContaining({
              id: "import-product-1-variant-1",
              quantity: 5,
              price: 48000,
              image: null,
            }),
          ],
        },
      },
    });
  });

  it("never imports product or variant images", () => {
    const result = mapProductImport(snapshotFixture());

    expect(result.children[0]?.values.media).toEqual([]);
    expect(result.children[0]?.values).toMatchObject({
      inventoryMode: "variant",
      variant: { variants: [expect.objectContaining({ image: null })] },
    });
    expect(result.ignoredAssetCount).toBe(2);
  });

  it("adds identity issues for missing taxonomy references", () => {
    const result = mapProductImport(
      snapshotFixture({
        products: [
          {
            ...snapshotFixture().products[0],
            category_id: "missing-category",
            collection_id: "missing-collection",
          },
        ],
      }),
    );

    expect(result.children[0]?.issues).toEqual([
      {
        step: "identity",
        path: "category",
        message: "The referenced category could not be found.",
      },
      {
        step: "identity",
        path: "collection",
        message: "The referenced collection could not be found.",
      },
    ]);
  });

  it("maps the real snapshot as a test-only bounded fixture", () => {
    const snapshotPath = fileURLToPath(
      new URL("../../../../scripts/seed/storefront-catalog-snapshot.json", import.meta.url),
    );
    const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8"));

    const result = mapProductImport(snapshot);

    expect(result.children).toHaveLength(100);
    expect(new Set(result.children.map((child) => child.values.inventoryMode))).toEqual(
      new Set(["unique", "stocked", "variant"]),
    );
    expect(result.children.every((child) => child.values.media.length === 0)).toBe(true);
    expect(result.ignoredAssetCount).toBeGreaterThan(0);
  });
});
