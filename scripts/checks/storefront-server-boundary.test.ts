import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "../..");
const sourceRoot = join(root, "src");
const sourceExtension = /\.(?:[cm]?[jt]sx?)$/;
const importPattern = /(?:from\s+|import\s*\()\s*["']([^"']+)["']/g;
const forbiddenClientImports = [
  "@/server/",
  "@/lib/prisma",
  "@/features/storefront/shared/catalog-loader",
  "server-only",
];

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return sourceExtension.test(entry) ? [path] : [];
  });
}

function importsOf(source: string): string[] {
  return [...source.matchAll(importPattern)].map((match) => match[1]);
}

describe("storefront server boundary", () => {
  it("prevents client modules from importing server-only catalogue code", () => {
    const offenders = sourceFiles(sourceRoot).flatMap((path) => {
      const source = readFileSync(path, "utf8");
      if (!/^\s*["']use client["'];/m.test(source)) return [];

      return importsOf(source)
        .filter((specifier) =>
          forbiddenClientImports.some(
            (forbidden) => specifier === forbidden || specifier.startsWith(forbidden),
          ),
        )
        .map((specifier) => `${relative(root, path)} -> ${specifier}`);
    });

    expect(offenders).toEqual([]);
  });
});
