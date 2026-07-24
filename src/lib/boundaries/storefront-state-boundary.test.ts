import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function sourceFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : /\.[cm]?[jt]sx?$/.test(entry.name) ? [path] : [];
  });
}

const retiredFiles = [
  "src/components/shop/shop-provider.tsx",
  "src/features/storefront/shared/cart-persistence.ts",
  "src/features/storefront/shared/cart-persistence.test.ts",
  "src/features/storefront/shared/storefront-experience-provider.tsx",
  "src/features/storefront/shared/storefront-experience-data.ts",
  "src/features/storefront/shared/storefront-experience-data.test.ts",
  "src/features/storefront/checkout/checkout-flow.tsx",
  "src/lib/catalogue.ts",
  "src/lib/order.ts",
];

const retiredImports = [
  "@/components/shop/shop-provider",
  "./cart-persistence",
  "storefront-experience-provider",
  "storefront-experience-data",
  "@/lib/catalogue",
  "@/lib/order",
  'storefront/checkout/checkout-flow"',
  "storefront/checkout/checkout-flow'",
];

describe("storefront state boundaries", () => {
  it("does not retain retired providers or compatibility modules", () => {
    for (const path of retiredFiles) expect(existsSync(join(root, path)), path).toBe(false);
  });

  it("does not import a retired storefront state path", () => {
    const violations = sourceFiles(join(root, "src")).flatMap((path) => {
      const source = readFileSync(path, "utf8");
      return retiredImports
        .filter((retiredImport) => source.includes(retiredImport))
        .map((retiredImport) => `${path.replace(`${root}/`, "")}: ${retiredImport}`);
    });
    expect(violations).toEqual([]);
  });

  it("mounts client state and auth only inside the storefront boundary", () => {
    const rootProviders = readFileSync(join(root, "src/app/app-providers.tsx"), "utf8");
    const storefrontProviders = readFileSync(join(root, "src/app/storefront-providers.tsx"), "utf8");
    const routeBoundary = readFileSync(join(root, "src/app/storefront-route-boundary.tsx"), "utf8");

    expect(rootProviders).not.toContain("StorefrontClientStateProvider");
    expect(rootProviders).not.toContain("StorefrontAuthProvider");
    expect(storefrontProviders).toContain("StorefrontClientStateProvider");
    expect(storefrontProviders).toContain("StorefrontAuthProvider");
    expect(routeBoundary).toContain("getCurrentSession");
    expect(routeBoundary).toContain("loadStorefrontShellCatalog");
    expect(routeBoundary).not.toMatch(/\bloadStorefrontCatalog\b/);
  });

  it("persists only minimal intent fields", () => {
    const stateContract = readFileSync(
      join(root, "src/features/storefront/shared/storefront-client-state.ts"),
      "utf8",
    );
    expect(stateContract).toContain("productId: string");
    expect(stateContract).toContain("variantId: string | null");
    expect(stateContract).toContain("quantity: number");
    expect(stateContract).toContain("expiresAt: number");
    expect(stateContract).not.toContain("imageUrl:");
    expect(stateContract).not.toContain("price:");
    expect(stateContract).not.toContain("name:");
  });
});
