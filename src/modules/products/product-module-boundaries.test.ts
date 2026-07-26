import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = process.cwd();
const sourceRoot = path.join(repositoryRoot, "src");
const productModuleRoot = path.join(sourceRoot, "modules/products");

const retiredProductPaths = [
  "@/server/commerce/catalogue",
  "@/features/storefront/catalogue",
  "@/features/storefront/product",
  "@/features/storefront/shared/catalogue-data",
] as const;

const forbiddenProductModuleImports = ["@/features", "@/app", "@/server"] as const;

describe("Products module boundaries", () => {
  it("keeps production consumers off retired product and catalogue paths", async () => {
    const sourceFiles = await collectSourceFiles(sourceRoot);
    const offenders: string[] = [];

    for (const filePath of sourceFiles) {
      const relative = normalize(path.relative(repositoryRoot, filePath));
      if (isTest(relative)) continue;
      const source = await readFile(filePath, "utf8");
      for (const importPath of retiredProductPaths) {
        if (source.includes(importPath)) offenders.push(`${relative} -> ${importPath}`);
      }
    }

    expect(offenders).toEqual([]);
  });

  it("keeps the Products domain independent of app, feature and top-level server layers", async () => {
    const sourceFiles = await collectSourceFiles(productModuleRoot);
    const offenders: string[] = [];

    for (const filePath of sourceFiles) {
      const relative = normalize(path.relative(repositoryRoot, filePath));
      if (isTest(relative)) continue;
      const source = await readFile(filePath, "utf8");
      for (const importPath of forbiddenProductModuleImports) {
        if (source.includes(importPath)) offenders.push(`${relative} -> ${importPath}`);
      }
    }

    expect(offenders).toEqual([]);
  });

  it("keeps browser catalogue transport on the versioned Products API", async () => {
    const clientSource = await readFile(
      path.join(productModuleRoot, "client/storefront-catalogue.ts"),
      "utf8",
    );

    expect(clientSource).toContain('"/api/v1/products"');
    expect(clientSource).not.toContain("@/modules/products/server");
    expect(clientSource).not.toContain("@/server");
    expect(clientSource).not.toContain("/api/v1/storefront/");
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

function isTest(relative: string) {
  return relative.includes(".test.") || relative.includes(".spec.");
}

function normalize(value: string) {
  return value.split(path.sep).join("/");
}
