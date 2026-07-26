import { describe, expect, it } from "vitest";
import { mapInventoryCounts } from "@/modules/inventory/server/mappers";
import {
  decodeProductTaxonomyId as decodeTaxonomyId,
  mapAdminProductRow as mapInventoryProductRow,
  mapProductTaxonomyRow as mapTaxonomyRow,
} from "@/modules/products/server/mappers";

const decimal = (value: number) => ({ toNumber: () => value });

function baseRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "019f65c1-74fe-7bd3-8400-000000000001",
    slug: "test-product",
    name: "Test product",
    description: "A persisted product.",
    brand: "Laitstyles",
    inventory_mode: "stocked",
    price: decimal(18_500),
    reference_price: decimal(28_000),
    cost: decimal(8_000),
    lifecycle: "active",
    publication: "published",
    low_stock_threshold: 2,
    archive_number: null,
    sku: "SKU-1",
    condition: null,
    size_label: "M",
    colour: "Black",
    material: null,
    fit: null,
    style: null,
    care_instructions: null,
    flaw_notes: null,
    weight_grams: 750,
    pickup_available: true,
    delivery_restrictions: "",
    packaging_notes: "",
    scheduled_at: null,
    created_at: new Date("2026-01-01T00:00:00.000Z"),
    updated_at: new Date("2026-01-02T00:00:00.000Z"),
    catalogue_categories: { name: "Tops" },
    catalogue_collections: null,
    product_channels: [{ channel: "storefront" }],
    product_media: [
      {
        id: "media-1",
        position: 0,
        kind: "product_cover",
        variant_id: null,
        cloudinary_assets: {
          secure_url: "https://example.com/cover.jpg",
          delivery_url: null,
          public_id: "cover-1",
          alt: "Cover",
          provider: "cloudinary",
        },
      },
    ],
    product_measurements: [],
    product_variants: [],
    stock_levels: [
      {
        id: "stock-1",
        product_id: "019f65c1-74fe-7bd3-8400-000000000001",
        variant_id: null,
        total_received: 8,
        available: 3,
        reserved: 1,
        committed: 2,
        sold: 1,
        returned: 0,
        damaged: 1,
      },
    ],
    ...overrides,
  };
}

describe("mapInventoryCounts", () => {
  it("protects committed units by exposing them with reserved units", () => {
    expect(
      mapInventoryCounts({
        total_received: 8,
        available: 3,
        reserved: 1,
        committed: 2,
        sold: 1,
        returned: 0,
        damaged: 1,
      }),
    ).toEqual({
      totalReceived: 8,
      available: 3,
      reserved: 3,
      sold: 1,
      returned: 0,
      damaged: 1,
    });
  });
});

describe("mapInventoryProductRow", () => {
  it("maps stocked products without fabricating catalogue state", () => {
    const product = mapInventoryProductRow(baseRow() as never);
    expect(product).toMatchObject({
      inventoryMode: "stocked",
      price: 18_500,
      referencePrice: 28_000,
      category: "Tops",
      collection: null,
      channels: ["storefront"],
    });
    if (product.inventoryMode === "stocked") {
      expect(product.stock.reserved).toBe(3);
    }
  });

  it("maps unique measurements and the one-of-one stock record", () => {
    const product = mapInventoryProductRow(
      baseRow({
        inventory_mode: "unique",
        archive_number: "LST-0001",
        sku: null,
        condition: "Excellent",
        size_label: "M",
        product_measurements: [{ label: "Chest", value: "54 cm", position: 0 }],
      }) as never,
    );
    expect(product.inventoryMode).toBe("unique");
    if (product.inventoryMode === "unique") {
      expect(product.archiveNumber).toBe("LST-0001");
      expect(product.measurements).toEqual([{ label: "Chest", value: "54 cm" }]);
    }
  });

  it("maps variant stock and derives option names", () => {
    const product = mapInventoryProductRow(
      baseRow({
        inventory_mode: "variant",
        sku: null,
        size_label: null,
        colour: null,
        stock_levels: [],
        product_variants: [
          {
            id: "019f65c1-74fe-7bd3-8400-000000000011",
            label: "Small / Blue",
            sku: "SKU-S-BLUE",
            size: "S",
            colour: "Blue",
            price: decimal(19_000),
            cost: null,
            position: 0,
            product_media: [],
            stock_levels: [
              {
                id: "stock-v1",
                total_received: 4,
                available: 2,
                reserved: 0,
                committed: 1,
                sold: 1,
                returned: 0,
                damaged: 0,
              },
            ],
          },
        ],
      }) as never,
    );
    expect(product.inventoryMode).toBe("variant");
    if (product.inventoryMode === "variant") {
      expect(product.optionNames).toEqual(["Size", "Colour"]);
      expect(product.variants[0]?.stock.reserved).toBe(1);
    }
  });
});

describe("taxonomy ids", () => {
  it("round-trips the table discriminator and real database id", () => {
    const item = mapTaxonomyRow(
      {
        id: "019f65c1-74fe-7bd3-8400-000000000021",
        slug: "tops",
        name: "Tops",
        created_at: new Date("2026-01-01T00:00:00.000Z"),
        updated_at: new Date("2026-01-02T00:00:00.000Z"),
      },
      "category",
    );
    expect(item.id).toBe("category:019f65c1-74fe-7bd3-8400-000000000021");
    expect(decodeTaxonomyId(item.id)).toEqual({
      kind: "category",
      id: "019f65c1-74fe-7bd3-8400-000000000021",
    });
  });
});
