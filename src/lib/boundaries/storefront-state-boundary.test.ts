import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

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
  return [...source.matchAll(/(?:from\s+|import\s*)["']([^"']+)["']/g)].map(
    (match) => match[1],
  );
}

const retiredFiles = [
  path("src", "components", "shop", "shop-provider.tsx"),
  path("src", "features", "storefront", "shared", "cart-persistence.ts"),
  path("src", "features", "storefront", "shared", "cart-persistence.test.ts"),
  path("src", "features", "storefront", "shared", ["storefront-experience", "provider.tsx"].join("-")),
  path("src", "features", "storefront", "shared", ["storefront-experience", "data.ts"].join("-")),
  path("src", "features", "storefront", "shared", ["storefront-experience", "data.test.ts"].join("-")),
  path("src", "features", "storefront", "checkout", "checkout-flow.tsx"),
  path("src", "lib", "catalogue.ts"),
  path("src", "lib", "order.ts"),
  path("src", "app", "storefront-providers.tsx"),
];

const retiredImports = [
  path("@", "components", "shop", "shop-provider"),
  [".", "cart-persistence"].join("/"),
  ["storefront-experience", "provider"].join("-"),
  ["storefront-experience", "data"].join("-"),
  path("@", "lib", "catalogue"),
  path("@", "lib", "order"),
  path("@", "features", "storefront", "checkout", "checkout-flow"),
  path("@", "app", "storefront-providers"),
];

describe("storefront state boundaries", () => {
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

  it("mounts the storefront query, hydration and auth boundaries only inside the storefront client boundary", () => {
    const appProvider = readFileSync(join(root, "src/providers/providers.tsx"), "utf8");
    const clientBoundary = readFileSync(
      join(root, "src/app/storefront-client-boundary.tsx"),
      "utf8",
    );
    const routeBoundary = readFileSync(
      join(root, "src/app/storefront-route-boundary.tsx"),
      "utf8",
    );

    expect(appProvider).not.toContain("StorefrontQueryProvider");
    expect(appProvider).not.toContain("StorefrontStateHydrator");
    expect(appProvider).not.toContain("StorefrontAuthProvider");
    expect(clientBoundary).toContain("StorefrontQueryProvider");
    expect(clientBoundary).toContain("StorefrontStateHydrator");
    expect(clientBoundary).toContain("StorefrontAuthProvider");
    expect(clientBoundary).not.toContain("StorefrontClientStateProvider");
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
