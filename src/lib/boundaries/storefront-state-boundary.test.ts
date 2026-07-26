import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { classifyArchitectureGraph } from "../../../scripts/checks/architecture-guard.mjs";

const root = process.cwd();

function sourceFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = join(directory, entry.name);
    return entry.isDirectory()
      ? sourceFiles(filePath)
      : /\.[cm]?[jt]sx?$/.test(entry.name)
        ? [filePath]
        : [];
  });
}

function path(...segments: string[]) {
  return segments.join("/");
}

function importedModules(source: string): string[] {
  return [...source.matchAll(/(?:from\s+|import\s*)["']([^"']+)["']/g)].map((match) => match[1]);
}

const retiredFiles = [
  path("src", "components", "shop", "shop-provider.tsx"),
  path("src", "features", "storefront", "shared", "cart-persistence.ts"),
  path("src", "features", "storefront", "shared", "cart-persistence.test.ts"),
  path(
    "src",
    "features",
    "storefront",
    "shared",
    ["storefront-experience", "provider.tsx"].join("-"),
  ),
  path("src", "features", "storefront", "shared", ["storefront-experience", "data.ts"].join("-")),
  path(
    "src",
    "features",
    "storefront",
    "shared",
    ["storefront-experience", "data.test.ts"].join("-"),
  ),
  path("src", "features", "storefront", "shared", "storefront-provider.tsx"),
  path("src", "features", "storefront", "shared", "storefront-client-state-provider.tsx"),
  path("src", "features", "storefront", "shared", "overlays", "legacy-cart-drawer.tsx"),
  path("src", "features", "storefront", "home", "components", "home-shop-view.tsx"),
  path("src", "features", "storefront", "checkout", "checkout-flow.tsx"),
  path("src", "features", "storefront", "shared", "catalog-adapter.ts"),
  path("src", "features", "storefront", "shared", "catalog-adapter.test.ts"),
  path("src", "features", "storefront", "shared", "catalog-loader.ts"),
  path("src", "features", "storefront", "shared", "catalog-loader.test.ts"),
  path("src", "features", "storefront", "shared", "catalog-types.ts"),
  path("src", "modules", "products", "client", "storefront-catalog.ts"),
  path("src", "app", "api", "v1", "storefront", "catalog", "route.ts"),
  path("src", "app", "api", "v1", "storefront", "catalog", "route.test.ts"),
  path("src", "lib", "catalogue.ts"),
  path("src", "lib", "order.ts"),
  path("src", "app", "storefront-providers.tsx"),
];

const retiredImports = [
  path("@", "components", "shop", "shop-provider"),
  [".", "cart-persistence"].join("/"),
  ["storefront-experience", "provider"].join("-"),
  ["storefront-experience", "data"].join("-"),
  path("@", "features", "storefront", "shared", "storefront-provider"),
  path("@", "features", "storefront", "shared", "storefront-client-state-provider"),
  path("@", "features", "storefront", "shared", "overlays", "legacy-cart-drawer"),
  path("@", "features", "storefront", "home", "components", "home-shop-view"),
  path("@", "features", "storefront", "shared", "catalog-adapter"),
  path("@", "features", "storefront", "shared", "catalog-loader"),
  path("@", "features", "storefront", "shared", "catalog-types"),
  path("@", "modules", "products", "client", "storefront-catalog"),
  path("@", "lib", "catalogue"),
  path("@", "lib", "order"),
  path("@", "features", "storefront", "checkout", "checkout-flow"),
  path("@", "app", "storefront-providers"),
];

const retiredCatalogSymbols = [
  "StorefrontCatalogPayload",
  "StorefrontShellCatalogPayload",
  "storefrontCatalogQueryKey",
  "getStorefrontShellCatalog",
  "loadStorefrontCatalog",
  "loadStorefrontShellCatalog",
  "useStorefrontCatalog",
  "useStorefrontCatalogData",
  "buildStorefrontCatalog",
  "buildStorefrontShellCatalog",
  "projectLegacyProduct",
  "projectLegacyProductSummary",
];

describe("storefront state boundaries", () => {
  it("checks only added American catalogue debt and ignores packages and retained database fields", () => {
    const files = {
      "src/data.ts": `
        import catalogPlugin from "catalog-plugin";
        export const row = { catalogId: "retained-database-field" };
        export const catalogLabel = catalogPlugin.label;
      `,
    };
    const previousFiles = {
      "src/data.ts": 'export const row = { catalogId: "retained-database-field" };',
    };

    expect(classifyArchitectureGraph({ files, previousFiles })).toEqual([
      {
        rule: "american-catalogue-language",
        importer: "src/data.ts",
        detail: "New American catalogue identifier: catalogLabel.",
      },
    ]);
  });

  it("does not retain retired providers or compatibility modules", () => {
    for (const retiredFile of retiredFiles) {
      expect(existsSync(join(root, retiredFile)), retiredFile).toBe(false);
    }
  });

  it("does not import a retired storefront state path", () => {
    const violations = sourceFiles(join(root, "src"))
      .filter((filePath) => !/\.test\.[cm]?[jt]sx?$/.test(filePath))
      .flatMap((filePath) => {
        const imports = importedModules(readFileSync(filePath, "utf8"));
        return retiredImports
          .filter((retiredImport) => imports.includes(retiredImport))
          .map((retiredImport) => `${filePath.replace(`${root}/`, "")}: ${retiredImport}`);
      });
    expect(violations).toEqual([]);
  });

  it("keeps the storefront catalogue contract British and module-owned", () => {
    const violations = sourceFiles(join(root, "src"))
      .filter((filePath) => !filePath.endsWith("storefront-state-boundary.test.ts"))
      .flatMap((filePath) => {
        const source = readFileSync(filePath, "utf8");
        const relativePath = filePath.replace(`${root}/`, "");
        const symbolViolations = retiredCatalogSymbols
          .filter((symbol) => new RegExp(`\\b${symbol}\\b`).test(source))
          .map((symbol) => `${relativePath}: ${symbol}`);
        const routeViolation = /["'`]\/api\/v1\/storefront\/catalog["'`]/.test(source)
          ? [`${relativePath}: /api/v1/storefront/catalog`]
          : [];
        return [...symbolViolations, ...routeViolation];
      });

    expect(violations).toEqual([]);

    const shellQuery = readFileSync(
      join(root, "src/modules/products/server/storefront/shell-query.ts"),
      "utf8",
    );
    expect(shellQuery).not.toContain("@/features/storefront/");
    expect(shellQuery).toContain("catalogue-projection");
    expect(shellQuery).toContain("catalogue-contract");
  });

  it("mounts the storefront query, hydration and auth boundaries only inside the storefront client boundary", () => {
    const appProvider = readFileSync(join(root, "src/providers/providers.tsx"), "utf8");
    const clientBoundary = readFileSync(
      join(root, "src/app/storefront-client-boundary.tsx"),
      "utf8",
    );
    const routeBoundary = readFileSync(join(root, "src/app/storefront-route-boundary.tsx"), "utf8");

    expect(appProvider).not.toContain("StorefrontQueryProvider");
    expect(appProvider).not.toContain("StorefrontStateHydrator");
    expect(appProvider).not.toContain("StorefrontAuthProvider");
    expect(clientBoundary).toContain("StorefrontQueryProvider");
    expect(clientBoundary).toContain("StorefrontStateHydrator");
    expect(clientBoundary).toContain("StorefrontAuthProvider");
    expect(clientBoundary).not.toContain("StorefrontClientStateProvider");
    expect(clientBoundary).not.toContain("StorefrontProvider");
    expect(routeBoundary).toContain("getCurrentSession");
    expect(routeBoundary).toContain("loadStorefrontShellCatalogue");
    expect(routeBoundary).not.toMatch(/\bloadStorefrontCatalogue\b/);
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
