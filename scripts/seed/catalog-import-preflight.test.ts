import { describe, expect, it } from "vitest";
import type { Prisma } from "../../prisma/generated/prisma/index";
import { assertNoCatalogTargetConflicts } from "./catalog-import-preflight";
import type { CatalogSnapshot } from "./catalog-snapshot";

function emptySnapshot(): CatalogSnapshot {
  return {
    schema_version: 2,
    catalogue_categories: [],
    catalogue_collections: [],
    products: [],
    product_channels: [],
    product_variants: [],
    stock_levels: [],
    product_measurements: [],
    cloudinary_assets: [],
    product_media: [],
  };
}

function transaction(overrides: Record<string, unknown> = {}): Prisma.TransactionClient {
  const delegate = { findMany: async () => [] };
  return {
    catalogue_categories: delegate,
    catalogue_collections: delegate,
    products: delegate,
    product_variants: delegate,
    cloudinary_assets: delegate,
    product_media: delegate,
    product_measurements: delegate,
    product_variant_measurements: delegate,
    stock_levels: delegate,
    ...overrides,
  } as unknown as Prisma.TransactionClient;
}

describe("assertNoCatalogTargetConflicts", () => {
  it("rejects an existing category whose stable id points at another slug", async () => {
    const source = emptySnapshot();
    source.catalogue_categories.push({
      id: "019f65c1-74fe-7bd3-8100-000000000001",
      slug: "jackets",
      name: "Jackets",
      image_url: "https://example.com/jackets.jpg",
    });
    const tx = transaction({
      catalogue_categories: {
        findMany: async () => [
          {
            id: "019f65c1-74fe-7bd3-8100-000000000001",
            slug: "different-slug",
          },
        ],
      },
    });

    await expect(assertNoCatalogTargetConflicts(tx, source, [], [])).rejects.toThrow(
      /Preflight conflict: catalogue category/,
    );
  });

  it("rejects an existing variant occupying the same product-scoped SKU", async () => {
    const source = emptySnapshot();
    source.product_variants.push({
      id: "019f65c1-74fe-7bd3-8700-000000000001",
      product_id: "019f65c1-74fe-7bd3-8400-000000000001",
      title: "Medium",
      sku: "JACKET-M",
      size_label: "M",
      colour: "Black",
      price_override: null,
      created_at: "2026-07-15T14:30:00.000Z",
    });
    const tx = transaction({
      product_variants: {
        findMany: async () => [
          {
            id: "019f65c1-74fe-7bd3-8700-000000000099",
            product_id: "019f65c1-74fe-7bd3-8400-000000000001",
            sku: "JACKET-M",
          },
        ],
      },
    });

    await expect(assertNoCatalogTargetConflicts(tx, source, [], [])).rejects.toThrow(
      /Preflight conflict: product variant/,
    );
  });

  it("allows idempotent rows that keep the same stable identity", async () => {
    const source = emptySnapshot();
    source.catalogue_categories.push({
      id: "019f65c1-74fe-7bd3-8100-000000000001",
      slug: "jackets",
      name: "Jackets",
      image_url: "https://example.com/jackets.jpg",
    });
    const tx = transaction({
      catalogue_categories: {
        findMany: async () => [
          {
            id: "019f65c1-74fe-7bd3-8100-000000000001",
            slug: "jackets",
          },
        ],
      },
    });

    await expect(assertNoCatalogTargetConflicts(tx, source, [], [])).resolves.toBeUndefined();
  });
});
