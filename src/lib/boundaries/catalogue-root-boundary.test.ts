import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("catalogue root boundary", () => {
  it("does not load or serialize catalogue data through the root layout", () => {
    const layout = read("src/app/layout.tsx");
    const providers = read("src/app/app-providers.tsx");
    const chrome = read("src/features/storefront/shell/site-chrome.tsx");
    const source = `${layout}\n${providers}\n${chrome}`;

    expect(source).not.toContain("loadStorefrontCatalog");
    expect(source).not.toContain("catalogPromise");
    expect(source).not.toContain("catalog.products");
    expect(source).not.toContain("products={catalog");
  });

  it("keeps active catalogue routes on canonical DTOs", () => {
    const catalogue = read("src/features/storefront/catalogue/product-catalogue.tsx");
    const product = read("src/features/storefront/product/product-detail.tsx");

    expect(catalogue).toContain("ProductSummary");
    expect(product).toContain("ProductDetail as ProductDetailData");
    expect(`${catalogue}\n${product}`).not.toContain("shared/catalogue-data");
    expect(`${catalogue}\n${product}`).not.toContain("useStorefront(");
  });
});
