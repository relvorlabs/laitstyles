import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = process.cwd();
const sourceRoot = path.join(repositoryRoot, "src");
const storesRoot = path.join(sourceRoot, "stores");
const storefrontSharedRoot = path.join(sourceRoot, "features/storefront/shared");

const approvedStoreFiles = new Set([
  "cart.store.ts",
  "saved-items.store.ts",
  "storefront-ui.store.ts",
  "storefront-state-boundary.test.ts",
]);

const legacyProviderFiles = [
  "src/features/storefront/shared/storefront-provider.tsx",
  "src/features/storefront/shared/storefront-client-state-provider.tsx",
  "src/features/storefront/shared/storefront-auth-provider.tsx",
] as const;

const allowedStorefrontProviderFiles = new Set(legacyProviderFiles.map((file) => path.basename(file)));

const forbiddenStoreImports = [
  "@/lib/prisma",
  "/server/",
  "@/app/auth/actions",
  "@/features/storefront/shared/catalogue-data",
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

const providerExpansionPatterns = [
  /from\s+["']@\/lib\/prisma/,
  /from\s+["'][^"']*\/server\//,
  /\buseReducer\b/,
] as const;

describe("Phase 6 storefront state boundary", () => {
  it("allows only the approved focused storefront stores", async () => {
    const files = await collectFilesIfPresent(storesRoot);
    const unexpected = files
      .map((file) => normalize(path.relative(storesRoot, file)))
      .filter((relative) => !approvedStoreFiles.has(relative));

    expect(
      unexpected,
      "Phase 6 may add only cart.store.ts, saved-items.store.ts and storefront-ui.store.ts.",
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
      "Components may consume focused hooks, but Zustand store creation/imports stay in src/stores.",
    ).toEqual([]);
  });

  it("keeps server records and complete products out of browser stores", async () => {
    const files = await collectFilesIfPresent(storesRoot);
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
      "Zustand owns browser intent only; Prisma records, remote collections and complete Product objects are prohibited.",
    ).toEqual([]);
  });

  it("does not create additional storefront context providers during the split", async () => {
    const files = await collectFilesIfPresent(storefrontSharedRoot);
    const providerFiles = files
      .map((file) => path.basename(file))
      .filter((file) => file.includes("provider") && !file.includes(".test."));
    const unexpected = providerFiles.filter((file) => !allowedStorefrontProviderFiles.has(file));

    expect(
      unexpected,
      "Phase 6 must reduce the provider graph rather than create replacement god providers.",
    ).toEqual([]);
  });

  it("prevents the temporary provider layer from gaining new server or reducer ownership", async () => {
    const offenders: string[] = [];

    for (const relative of legacyProviderFiles) {
      const file = path.join(repositoryRoot, relative);
      if (!(await exists(file))) continue;
      const source = await readFile(file, "utf8");
      for (const pattern of providerExpansionPatterns) {
        if (pattern.test(source)) offenders.push(`${relative} -> ${pattern}`);
      }
    }

    expect(offenders).toEqual([]);
  });

  it("keeps catalogue navigation on the Next router instead of direct history mutation", async () => {
    const relative = "src/features/storefront/catalogue/product-catalogue.tsx";
    const file = path.join(repositoryRoot, relative);
    const source = await readFile(file, "utf8");

    expect(source).not.toContain("window.history.replaceState");
    expect(source).not.toContain("window.history.pushState");
    expect(source).toContain("catalogueHref");
    expect(source).toMatch(/router\.(?:push|replace)\(/);
  });
});

async function collectFilesIfPresent(directory: string): Promise<string[]> {
  if (!(await exists(directory))) return [];
  return collectSourceFiles(directory);
}

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

async function exists(file: string) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

function normalize(value: string) {
  return value.split(path.sep).join("/");
}
