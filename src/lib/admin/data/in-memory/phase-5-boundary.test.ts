import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = process.cwd();
const sourceRoot = path.join(repositoryRoot, "src");

const allowedProductionImports = new Map<string, ReadonlySet<string>>([
  ["@/lib/admin/shared/admin-seed", new Set(["src/app/admin/layout.tsx"])],
  [
    "@/lib/admin/data/in-memory/admin-repositories",
    new Set(["src/features/admin/data/admin-repository-context.tsx"]),
  ],
]);

describe("Phase 5 admin persistence boundary", () => {
  it("does not expand production seed or in-memory repository ownership", async () => {
    const sourceFiles = await collectSourceFiles(sourceRoot);
    const offenders: string[] = [];

    for (const filePath of sourceFiles) {
      const relative = normalize(path.relative(repositoryRoot, filePath));
      if (relative.includes(".test.") || relative.includes(".spec.")) continue;

      const source = await readFile(filePath, "utf8");
      for (const [specifier, allowedFiles] of allowedProductionImports) {
        if (source.includes(specifier) && !allowedFiles.has(relative)) {
          offenders.push(`${relative} -> ${specifier}`);
        }
      }
    }

    expect(
      offenders,
      "Phase 5 may remove the recorded legacy edges, but production code must not create new ones.",
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
