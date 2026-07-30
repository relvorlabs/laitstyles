import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = process.cwd();
const modulesRoot = path.join(repositoryRoot, "src/modules");
const legacyFiles = {
  types: path.join(repositoryRoot, "src/lib/admin/product-editor/product-editor-types.ts"),
  schema: path.join(repositoryRoot, "src/lib/admin/product-editor/product-editor-schema.ts"),
  stockGuard: path.join(
    repositoryRoot,
    "src/lib/admin/product-editor/product-editor-stock-guard.ts",
  ),
};
const forbiddenModuleSpecifiers = [
  "@/lib/admin/product-editor/",
  "@/lib/admin/inventory/inventory-types",
];

describe("product and inventory domain ownership", () => {
  it("keeps production modules independent from legacy admin contracts", async () => {
    const sourceFiles = await collectSourceFiles(modulesRoot);
    const offenders: string[] = [];

    for (const filePath of sourceFiles) {
      const relative = normalize(path.relative(repositoryRoot, filePath));
      if (relative.includes(".test.") || relative.includes(".spec.")) continue;

      const source = await readFile(filePath, "utf8");
      if (forbiddenModuleSpecifiers.some((specifier) => source.includes(specifier))) {
        offenders.push(relative);
      }
    }

    expect(
      offenders,
      "Production modules must import contracts and policies from domain modules.",
    ).toEqual([]);
  }, 20000);

  it("keeps legacy editor files compatibility-only", async () => {
    const [types, schema, stockGuard] = await Promise.all([
      readFile(legacyFiles.types, "utf8"),
      readFile(legacyFiles.schema, "utf8"),
      readFile(legacyFiles.stockGuard, "utf8"),
    ]);

    expect(types.trim()).toMatch(/^export \{[\s\S]*\} from "@\/modules\/products\/types";$/);
    expect(schema.trim()).toBe('export * from "@/modules/products/editor-schema";');
    expect(stockGuard.trim()).toBe(
      'export { validateCommittedStockEdit } from "@/modules/inventory/server/committed-stock-guard";',
    );
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
