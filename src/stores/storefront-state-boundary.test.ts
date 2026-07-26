import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = process.cwd();
const sourceRoot = path.join(repositoryRoot, "src");
const storesRoot = path.join(sourceRoot, "stores");

const approvedStoreFiles = new Set([
  "cart.store.ts",
  "saved-items.store.ts",
  "storefront-ui.store.ts",
  "storefront-state-boundary.test.ts",
]);

const forbiddenStoreImports = [
  "@/lib/prisma",
  "/server/",
  "@/app/auth/actions",
  "@/features/",
  "@/modules/products/server",
  "@/modules/inventory/server",
  "@/modules/orders/server",
  "@/modules/customers/server",
  "@/modules/payments/server",
] as const;

const forbiddenStoreRecordPatterns = [
  /\bproducts\s*:/,
  /\borders\s*:/,
  /\bcustomers\s*:/,
  /\bpayments\s*:/,
  /\bpermissions\s*:/,
  /\b(?:readonly\s+)?Product\s*\[\s*\]/,
  /\bSet\s*<\s*Product\s*>/,
  /\bProduct\s*\|\s*null/,
] as const;

describe("storefront browser-state ownership", () => {
  it("allows only the approved focused storefront stores", async () => {
    const files = await collectSourceFiles(storesRoot);
    const unexpected = files
      .map((file) => normalize(path.relative(storesRoot, file)))
      .filter((relative) => !relative.endsWith(".test.ts") && !approvedStoreFiles.has(relative));

    expect(
      unexpected,
      "Storefront browser state must remain split across cart, saved-items and UI stores.",
    ).toEqual([]);
  });

  it("keeps Zustand store definitions inside src/stores", async () => {
    const sourceFiles = await collectSourceFiles(sourceRoot);
    const offenders: string[] = [];

    for (const file of sourceFiles) {
      const relative = normalize(path.relative(repositoryRoot, file));
      if (relative.startsWith("src/stores/") || relative.includes(".test.")) continue;
      const source = await readFile(file, "utf8");
      if (/from\s+["']zustand(?:\/[^"']*)?["']/.test(source)) offenders.push(relative);
    }

    expect(
      offenders,
      "Components may consume focused hooks, but Zustand creation/imports stay in src/stores.",
    ).toEqual([]);
  });

  it("keeps persistent records and complete products out of browser stores", async () => {
    const files = await collectSourceFiles(storesRoot);
    const offenders: string[] = [];

    for (const file of files) {
      const relative = normalize(path.relative(repositoryRoot, file));
      if (relative.includes(".test.")) continue;
      const source = await readFile(file, "utf8");

      for (const token of forbiddenStoreImports) {
        if (source.includes(token)) offenders.push(`${relative} -> ${token}`);
      }
      for (const pattern of forbiddenStoreRecordPatterns) {
        if (pattern.test(source)) offenders.push(`${relative} -> ${pattern}`);
      }
    }

    expect(
      offenders,
      "Zustand owns browser intent only; persistent records and complete Product objects are prohibited.",
    ).toEqual([]);
  });

  it("keeps catalogue URL mutation inside the Products navigation hook", async () => {
    const catalogueSource = await readFile(
      path.join(repositoryRoot, "src/modules/products/ui/storefront/product-catalogue.tsx"),
      "utf8",
    );
    const navigationSource = await readFile(
      path.join(repositoryRoot, "src/modules/products/client/use-catalogue-navigation.ts"),
      "utf8",
    );

    expect(catalogueSource).not.toContain("window.history.replaceState");
    expect(catalogueSource).not.toContain("window.history.pushState");
    expect(catalogueSource).not.toContain("catalogueHref");
    expect(catalogueSource).not.toMatch(/router\.(?:push|replace)\(/);
    expect(catalogueSource).toContain("useCatalogueNavigation");

    expect(navigationSource).toContain("catalogueHref");
    expect(navigationSource).toMatch(/router\.(?:push|replace)\(/);
  });
});

async function collectSourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) return collectSourceFiles(target);
      return /\.[cm]?[jt]sx?$/.test(entry.name) ? [target] : [];
    }),
  );
  return files.flat();
}

function normalize(value: string) {
  return value.split(path.sep).join("/");
}
