import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseModuleSyntax, stripComments } from "../../scripts/checks/module-export-guard.mjs";

const repositoryRoot = process.cwd();
const sourceRoot = path.join(repositoryRoot, "src");
const storesRoot = path.join(sourceRoot, "stores");

const approvedStoreFiles = new Set([
  "cart.store.ts",
  "saved-items.store.ts",
  "storefront-ui.store.ts",
  "storefront-state-boundary.test.ts",
]);

const forbiddenStoreImports = [
  "@/lib/prisma",
  "/server/",
  "@/app/auth/actions",
  "@/features/",
  "@/modules/products",
  "@/modules/inventory",
  "@/modules/orders",
  "@/modules/customers",
  "@/modules/payments",
] as const;

const completeProductFields = ["name", "slug", "price", "images"] as const;

const forbiddenStoreRecordPatterns = [
  /\bproducts\s*:/,
  /\borders\s*:/,
  /\bcustomers\s*:/,
  /\bpayments\s*:/,
  /\bpermissions\s*:/,
  /\b(?:readonly\s+)?Product\s*\[\s*\]/,
  /\bSet\s*<\s*Product\s*>/,
  /\bProduct\s*\|\s*null/,
] as const;

function importedModules(source: string): string[] {
  const parsed = parseModuleSyntax(source).imports.map((entry) => entry.specifier);
  const required = [
    ...stripComments(source).matchAll(/\brequire\s*\(\s*["']([^"']+)["']\s*\)/g),
  ].map((match) => match[1]);
  return [...new Set([...parsed, ...required])];
}

function importsPath(imports: readonly string[], target: string) {
  if (target === "/server/") return imports.some((value) => value.includes("/server/"));
  return imports.some((value) => value === target || value.startsWith(`${target}/`));
}

describe("storefront browser-state ownership", () => {
  it("recognizes static, re-exported, dynamic and required module edges", () => {
    expect(
      importedModules(`
        import value from "@/static";
        export { value as other } from "@/re-export";
        void import("@/dynamic");
        const required = require("@/required");
      `),
    ).toEqual(["@/static", "@/dynamic", "@/re-export", "@/required"]);
  });
  it("allows only the approved focused storefront stores", async () => {
    const files = await collectSourceFiles(storesRoot);
    const unexpected = files
      .map((file) => normalize(path.relative(storesRoot, file)))
      .filter((relative) => !relative.endsWith(".test.ts") && !approvedStoreFiles.has(relative));

    expect(
      unexpected,
      "Storefront browser state must remain split across cart, saved-items and UI stores.",
    ).toEqual([]);
  });

  it("keeps Zustand store definitions inside src/stores", async () => {
    const sourceFiles = await collectSourceFiles(sourceRoot);
    const offenders = (
      await Promise.all(
        sourceFiles.map(async (file) => {
          const relative = normalize(path.relative(repositoryRoot, file));
          if (relative.startsWith("src/stores/") || isTest(relative)) return [];
          const imports = importedModules(await readFile(file, "utf8"));
          return imports.some((value) => value === "zustand" || value.startsWith("zustand/"))
            ? [relative]
            : [];
        }),
      )
    ).flat();

    expect(
      offenders,
      "Components may consume focused hooks, but Zustand creation/imports stay in src/stores.",
    ).toEqual([]);
  }, 15_000);

  it("keeps persistent records and complete products out of browser stores", async () => {
    const files = await collectSourceFiles(storesRoot);
    const offenders: string[] = [];

    for (const file of files) {
      const relative = normalize(path.relative(repositoryRoot, file));
      if (relative.includes(".test.")) continue;
      const source = await readFile(file, "utf8");
      const imports = importedModules(source);

      for (const token of forbiddenStoreImports) {
        if (importsPath(imports, token)) offenders.push(`${relative} -> ${token}`);
      }
      for (const pattern of forbiddenStoreRecordPatterns) {
        if (pattern.test(source)) offenders.push(`${relative} -> ${pattern}`);
      }
      if (completeProductFields.every((field) => new RegExp(`\\b${field}\\s*:`).test(source))) {
        offenders.push(`${relative} -> complete Product structure`);
      }
    }

    expect(
      offenders,
      "Zustand owns browser intent only; persistent records and complete Product objects are prohibited.",
    ).toEqual([]);
  });

  it("keeps catalogue URL mutation inside the Products navigation hook", async () => {
    const sourceFiles = await collectSourceFiles(sourceRoot);
    const productionSources = await Promise.all(
      sourceFiles
        .filter((file) => !isTest(normalize(path.relative(repositoryRoot, file))))
        .map(async (file) => ({
          relative: normalize(path.relative(repositoryRoot, file)),
          source: await readFile(file, "utf8"),
        })),
    );
    const allowedFiles = new Set([
      "src/modules/products/client/catalogue-search-params.ts",
      "src/modules/products/client/use-catalogue-navigation.ts",
    ]);
    const offenders = productionSources.flatMap(({ relative, source }) => {
      if (allowedFiles.has(relative)) return [];
      const syntax = parseModuleSyntax(source);
      const code = stripComments(source);
      const importsCatalogueHref = syntax.imports.some((entry) =>
        entry.names.includes("catalogueHref"),
      );
      const isProductsClientOrUi =
        relative.startsWith("src/modules/products/client/") ||
        relative.startsWith("src/modules/products/ui/");
      const importsRouter = syntax.imports.some(
        (entry) => entry.specifier === "next/navigation" && entry.names.includes("useRouter"),
      );
      const mutatesProductsHistory =
        /(?:router\.(?:push|replace)|window\.history\.(?:push|replace)State)\s*\([^)]*["'`]\/products\?/.test(
          code,
        );
      return importsCatalogueHref ||
        mutatesProductsHistory ||
        (isProductsClientOrUi && importsRouter)
        ? [relative]
        : [];
    });
    const navigationSource = await readFile(
      path.join(repositoryRoot, "src/modules/products/client/use-catalogue-navigation.ts"),
      "utf8",
    );

    expect(offenders).toEqual([]);
    expect(navigationSource).toContain("catalogueHref");
    expect(navigationSource).toMatch(/router\.(?:push|replace)\(/);
  }, 15_000);
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

function isTest(relative: string) {
  return relative.includes(".test.") || relative.includes(".spec.");
}
