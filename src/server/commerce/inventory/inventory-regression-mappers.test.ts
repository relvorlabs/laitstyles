import { describe, expect, it } from "vitest";
import { mapAdminProductRow as mapInventoryProductRow } from "@/modules/products/server/mappers";

const decimal = (value: number) => ({ toNumber: () => value });

describe("inventory mapper regressions", () => {
  it("preserves the database condition label without downgrading it", () => {
    const product = mapInventoryProductRow({
      id: "019f65c1-74fe-7bd3-8400-000000000001",
      slug: "black-and-cream-campus-varsity-jacket",
      name: "Black and Cream Campus Varsity Jacket",
      description: "A persisted unique product.",
      brand: "Laitstyles Curated",
      inventory_mode: "unique",
      price: decimal(46_500),
      reference_price: decimal(57_000),
      cost: null,
      lifecycle: "active",
      publication: "published",
      low_stock_threshold: 1,
      archive_number: "LST-0001",
      sku: null,
      condition: "Very good",
      size_label: "M",
      colour: "Black with cream sleeves",
      material: null,
      fit: null,
      style: null,
      care_instructions: null,
      flaw_notes: null,
      weight_grams: null,
      pickup_available: true,
      delivery_restrictions: "",
      packaging_notes: "",
      scheduled_at: null,
      created_at: new Date("2026-07-15T14:30:00.000Z"),
      updated_at: new Date("2026-07-15T14:30:00.000Z"),
      catalogue_categories: { name: "Jackets" },
      catalogue_collections: { name: "Women" },
      product_channels: [{ channel: "storefront" }],
      product_media: [],
      product_measurements: [],
      product_variants: [],
      stock_levels: [
        {
          id: "019f65c1-74fe-7bd3-8600-000000000001",
          product_id: "019f65c1-74fe-7bd3-8400-000000000001",
          variant_id: null,
          total_received: 1,
          available: 1,
          reserved: 0,
          committed: 0,
          sold: 0,
          returned: 0,
          damaged: 0,
        },
      ],
    } as never);

    expect(product.inventoryMode).toBe("unique");
    if (product.inventoryMode === "unique") {
      expect(product.condition).toBe("Very good");
    }
  });
});
