import { describe, expect, it, vi } from "vitest";
import {
  loadCatalogProductDetails,
  loadCatalogProductSummaries,
  loadCatalogSnapshot,
  loadStorefrontCatalog,
  loadStorefrontProductBySlug,
  loadStorefrontProductPageBySlug,
} from "@/lib/storefront/catalog-data";

// connection() requires a real Next.js request scope, which a plain Vitest
// run doesn't have; these tests exercise pure data-mapping, not the request-
// time dynamism connection() marks, so it's a no-op here (same rationale as
// the server-only stub in vitest.config.ts).
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: vi.fn(async () => undefined),
}));

describe("public storefront catalog server repository", () => {
  it("loads every archive relation from one public snapshot", async () => {
    const [snapshot, details, summaries, storefront] = await Promise.all([
      loadCatalogSnapshot(),
      loadCatalogProductDetails(),
      loadCatalogProductSummaries(),
      loadStorefrontCatalog(),
    ]);

    expect(snapshot.products).toHaveLength(100);
    expect(snapshot.product_variants).toHaveLength(173);
    expect(snapshot.stock_levels).toHaveLength(240);
    expect(snapshot.product_measurements).toHaveLength(884);
    expect(snapshot.product_condition_reports).toHaveLength(100);
    expect(snapshot.cloudinary_assets).toHaveLength(100);
    expect(snapshot.product_media).toHaveLength(100);
    expect(snapshot.tags).toHaveLength(183);
    expect(snapshot.product_tags).toHaveLength(540);
    expect(snapshot.variant_option_values).toHaveLength(289);
    expect(details).toHaveLength(100);
    expect(summaries).toHaveLength(100);
    expect(storefront.products).toHaveLength(100);
  });

  it("preserves all three Prisma inventory modes and their stock semantics", async () => {
    const snapshot = await loadCatalogSnapshot();
    expect(new Set(snapshot.products.map((product) => product.inventory_mode))).toEqual(
      new Set(["unique", "stocked", "variant"]),
    );
    for (const product of snapshot.products) {
      const stock = snapshot.stock_levels.filter((row) => row.product_id === product.id);
      if (product.inventory_mode === "variant") {
        expect(stock.length).toBeGreaterThan(0);
        expect(stock.every((row) => row.variant_id !== null)).toBe(true);
      } else {
        expect(stock).toHaveLength(1);
        expect(stock[0].variant_id).toBeNull();
      }
    }
  });

  it("keeps foreign keys connected and audited external media explicit", async () => {
    const snapshot = await loadCatalogSnapshot();
    const productIds = new Set(snapshot.products.map((product) => product.id));
    const assetIds = new Set(snapshot.cloudinary_assets.map((asset) => asset.id));
    for (const media of snapshot.product_media) {
      expect(productIds.has(media.product_id)).toBe(true);
      expect(assetIds.has(media.asset_id)).toBe(true);
    }
    for (const asset of snapshot.cloudinary_assets) {
      expect(asset.external_only).toBe(true);
      expect(asset.provider_photo_id).toBeTruthy();
      expect(asset.secure_url).toMatch(/^https:\/\/images\.pexels\.com\/photos\//);
    }
  });

  it("maps database major-unit money into existing DTO contracts", async () => {
    const [snapshot, details, storefront] = await Promise.all([
      loadCatalogSnapshot(),
      loadCatalogProductDetails(),
      loadStorefrontCatalog(),
    ]);
    expect(details[0].price).toBe(snapshot.products[0].price * 100);
    expect(storefront.products[0].price).toBe(snapshot.products[0].price);
    expect(storefront.products[0].databaseId).toBe(snapshot.products[0].id);
  });

  it("returns null for missing slugs without weakening the route not-found boundary", async () => {
    const storefront = await loadStorefrontCatalog();
    expect(await loadStorefrontProductBySlug(storefront.products[0].slug)).toEqual(
      storefront.products[0],
    );
    expect(await loadStorefrontProductBySlug("missing-product")).toBeNull();
  });

  it("loads matching commerce and canonical detail records for a product page", async () => {
    const storefront = await loadStorefrontCatalog();
    const pageData = await loadStorefrontProductPageBySlug(storefront.products[0].slug);

    expect(pageData?.product).toEqual(storefront.products[0]);
    expect(pageData?.detail.slug).toBe(storefront.products[0].slug);
    expect(await loadStorefrontProductPageBySlug("missing-product")).toBeNull();
  });
});
