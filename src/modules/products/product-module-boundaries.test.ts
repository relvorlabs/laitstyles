import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { legacyArchitectureExceptions } from "../../../scripts/checks/architecture-legacy-exceptions.mjs";
import {
  classifyModuleGraph,
  parseModuleSyntax,
  stripComments,
} from "../../../scripts/checks/module-export-guard.mjs";

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
const productEditorUiLegacyImports = [
  "@/features/admin/shared/admin-icon",
  "@/features/admin/inventory/catalogue-taxonomy-manager",
] as const;

function importedModules(source: string): string[] {
  const parsed = parseModuleSyntax(source).imports.map((entry) => entry.specifier);
  const required = [
    ...stripComments(source).matchAll(/\brequire\s*\(\s*["']([^"']+)["']\s*\)/g),
  ].map((match) => match[1]);
  return [...new Set([...parsed, ...required])];
}

function importsPath(imports: readonly string[], target: string) {
  return imports.some((importPath) => importPath === target || importPath.startsWith(`${target}/`));
}

describe("Products module boundaries", () => {
  it("resolves default, named, type and re-exported bindings without checking packages", () => {
    const files = {
      "src/consumer.ts": `
        import React from "react";
        import defaultValue, {
          named,
          type Shape,
        } from "@/barrel";
        export { lazyValue } from "./lazy";
        void import("./dynamic");
      `,
      "src/barrel.ts": 'export { default, named, type Shape } from "./target";',
      "src/target.ts": `
        export default 1;
        export const named = 2;
        export interface Shape { value: string }
      `,
      "src/lazy.ts": "export const lazyValue = 3;",
      "src/dynamic.ts": "export const dynamicValue = 4;",
    };

    expect(classifyModuleGraph({ files })).toEqual([]);
  });

  it("reports exact missing internal modules and exports", () => {
    const files = {
      "src/consumer.ts": `
        import { missing } from "@/target";
        void import("./absent");
      `,
      "src/target.ts": "export const present = 1;",
    };

    expect(classifyModuleGraph({ files })).toEqual([
      {
        rule: "missing-export",
        importer: "src/consumer.ts",
        imported: "@/target",
        detail: "@/target does not export missing (resolved to src/target.ts).",
      },
      {
        rule: "unresolved-internal-module",
        importer: "src/consumer.ts",
        imported: "./absent",
        detail: "Cannot resolve internal module ./absent.",
      },
    ]);
  });

  it("keeps production consumers off retired product and catalogue paths", async () => {
    const sourceFiles = await collectSourceFiles(sourceRoot);
    const offenders = (
      await Promise.all(
        sourceFiles.map(async (filePath) => {
          const relative = normalize(path.relative(repositoryRoot, filePath));
          if (isTest(relative)) return [];
          const imports = importedModules(await readFile(filePath, "utf8"));
          return retiredProductPaths
            .filter((importPath) => importsPath(imports, importPath))
            .map((importPath) => `${relative} -> ${importPath}`);
        }),
      )
    ).flat();

    expect(offenders).toEqual([]);
  }, 15_000);

  it("keeps the Products domain independent of app, feature and top-level server layers", async () => {
    const sourceFiles = await collectSourceFiles(productModuleRoot);
    const offenders = (
      await Promise.all(
        sourceFiles.map(async (filePath) => {
          const relative = normalize(path.relative(repositoryRoot, filePath));
          if (isTest(relative)) return [];
          const imports = importedModules(await readFile(filePath, "utf8"));
          return forbiddenProductModuleImports.flatMap((importPath) => {
            const matchingImports = imports.filter(
              (candidate) => candidate === importPath || candidate.startsWith(`${importPath}/`),
            );
            return matchingImports
              .filter(
                (candidate) =>
                  !productEditorUiLegacyImports.includes(
                    candidate as (typeof productEditorUiLegacyImports)[number],
                  ) &&
                  !legacyArchitectureExceptions.some(
                    (entry) => entry.importer === relative && entry.imported === candidate,
                  ),
              )
              .map((candidate) => `${relative} -> ${candidate}`);
          });
        }),
      )
    ).flat();

    expect(offenders).toEqual([]);
  }, 15_000);

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
