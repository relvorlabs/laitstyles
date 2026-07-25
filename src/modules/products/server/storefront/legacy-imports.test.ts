import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = process.cwd();
const sourceRoot = path.join(repositoryRoot, "src");
const legacyCatalogueRoot = path.join(sourceRoot, "server/commerce/catalogue");
const legacyCataloguePrefix = "@/server/commerce/catalogue/";
const canonicalCataloguePrefix = "@/modules/products/server/storefront/";

describe("public product query ownership", () => {
  it("keeps production consumers on the product module", async () => {
    const sourceFiles = await collectSourceFiles(sourceRoot);
    const offenders: string[] = [];

    for (const filePath of sourceFiles) {
      const relative = normalize(path.relative(repositoryRoot, filePath));
      if (relative.includes(".test.") || relative.includes(".spec.")) continue;
      if (relative.startsWith("src/server/commerce/catalogue/")) continue;

      const source = await readFile(filePath, "utf8");
      if (source.includes(legacyCataloguePrefix)) offenders.push(relative);
    }

    expect(offenders, `Use ${canonicalCataloguePrefix} instead.`).toEqual([]);
  });

  it("keeps every legacy production catalogue file export-only", async () => {
    const legacyFiles = await collectSourceFiles(legacyCatalogueRoot);
    const offenders: string[] = [];

    for (const filePath of legacyFiles) {
      const relative = normalize(path.relative(repositoryRoot, filePath));
      if (relative.includes(".test.") || relative.includes(".spec.")) continue;

      const source = (await readFile(filePath, "utf8")).trim();
      const isModuleForwarder =
        /^export \* from "@\/modules\/products\/server\/storefront\/[a-z-]+";$/.test(source);
      if (!isModuleForwarder) offenders.push(relative);
    }

    expect(
      offenders,
      "Legacy catalogue paths may only forward exports to modules/products.",
    ).toEqual([]);
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
