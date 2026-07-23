import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "../..");
const runtimeRoot = join(root, "src");
const snapshotName = "storefront-catalog-snapshot.json";

function runtimeSourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return runtimeSourceFiles(path);
    return /\.(?:[cm]?[jt]sx?)$/.test(entry) ? [path] : [];
  });
}

describe("catalogue snapshot runtime boundary", () => {
  it("keeps the retained snapshot outside public assets", () => {
    expect(existsSync(join(root, "public", snapshotName))).toBe(false);
    expect(existsSync(join(__dirname, snapshotName))).toBe(true);
  });

  it("prevents runtime source modules from importing migration input", () => {
    const offenders = runtimeSourceFiles(runtimeRoot)
      .filter((path) => readFileSync(path, "utf8").includes(snapshotName))
      .map((path) => relative(root, path));

    expect(offenders).toEqual([]);
  });
});
