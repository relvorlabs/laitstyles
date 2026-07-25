import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = process.cwd();
const productModuleRoot = path.join(repositoryRoot, "src/modules/products");
const legacyTypePath = path.join(repositoryRoot, "src/lib/storefront/types.ts");
const legacyTypeSpecifier = "@/lib/storefront/types";

describe("storefront product read-model ownership", () => {
  it("keeps Product production code on canonical storefront types", async () => {
    const sourceFiles = await collectSourceFiles(productModuleRoot);
    const offenders: string[] = [];

    for (const filePath of sourceFiles) {
      const relative = normalize(path.relative(repositoryRoot, filePath));
      if (relative.includes(".test.") || relative.includes(".spec.")) continue;

      const source = await readFile(filePath, "utf8");
      if (source.includes(legacyTypeSpecifier)) offenders.push(relative);
    }

    expect(
      offenders,
      "Product module code must import public read models from its storefront type module.",
    ).toEqual([]);
  });

  it("keeps the legacy storefront type path compatibility-only", async () => {
    const source = (await readFile(legacyTypePath, "utf8")).trim();
    expect(source).toBe('export * from "@/modules/products/server/storefront/types";');
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
