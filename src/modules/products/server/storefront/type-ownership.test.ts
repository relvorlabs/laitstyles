import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = process.cwd();
const productModuleRoot = path.join(repositoryRoot, "src/modules/products");
const compatibilityTypePath = path.join(repositoryRoot, "src/lib/storefront/types.ts");
const compatibilitySpecifier = "@/lib/storefront/types";

const coreProductRoots = [
  path.join(productModuleRoot, "server"),
  path.join(productModuleRoot, "client"),
  path.join(productModuleRoot, "storefront"),
] as const;

describe("storefront product read-model ownership", () => {
  it("keeps Product server, client and contracts on module-owned storefront types", async () => {
    const sourceFiles = (
      await Promise.all(coreProductRoots.map((root) => collectSourceFiles(root)))
    ).flat();
    const offenders: string[] = [];

    for (const filePath of sourceFiles) {
      const relative = normalize(path.relative(repositoryRoot, filePath));
      if (isTest(relative)) continue;
      const source = await readFile(filePath, "utf8");
      if (source.includes(compatibilitySpecifier)) offenders.push(relative);
    }

    expect(
      offenders,
      "Product server/client/contracts must import read models from modules/products/storefront-types.",
    ).toEqual([]);
  });

  it("allows the compatibility type facade only as a type-only UI dependency", async () => {
    const uiRoot = path.join(productModuleRoot, "ui");
    const sourceFiles = await collectSourceFiles(uiRoot);
    const offenders: string[] = [];

    for (const filePath of sourceFiles) {
      const relative = normalize(path.relative(repositoryRoot, filePath));
      if (isTest(relative)) continue;
      const source = await readFile(filePath, "utf8");
      if (!source.includes(compatibilitySpecifier)) continue;

      const imports = source.split("\n").filter((line) => line.includes(compatibilitySpecifier));
      if (imports.some((line) => !line.trimStart().startsWith("import type"))) {
        offenders.push(relative);
      }
    }

    expect(offenders).toEqual([]);
  });

  it("keeps the compatibility storefront type path export-only", async () => {
    const source = (await readFile(compatibilityTypePath, "utf8")).trim();
    expect(source).toBe('export * from "@/modules/products/storefront-types";');
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
