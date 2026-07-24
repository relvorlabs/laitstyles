import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = process.cwd();
const sourceRoot = path.join(repositoryRoot, "src");
const legacyQuerySpecifier = "@/server/commerce/catalogue/catalog-repository";
const canonicalQuerySpecifier = "@/modules/products/server/storefront/queries";

describe("public product query ownership", () => {
  it("keeps production consumers on the product module", async () => {
    const sourceFiles = await collectSourceFiles(sourceRoot);
    const offenders: string[] = [];

    for (const filePath of sourceFiles) {
      const relative = normalize(path.relative(repositoryRoot, filePath));
      if (relative.includes(".test.") || relative.includes(".spec.")) continue;
      if (relative.startsWith("src/server/commerce/catalogue/")) continue;

      const source = await readFile(filePath, "utf8");
      if (source.includes(legacyQuerySpecifier)) offenders.push(relative);
    }

    expect(offenders, `Use ${canonicalQuerySpecifier} instead.`).toEqual([]);
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
