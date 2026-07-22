import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const WORKSPACE_ROOT = process.cwd();
const FORBIDDEN_CLIENT_IMPORTS = [
  "@/server",
  "@/lib/server",
  "@/lib/middleware",
  "@/lib/supabase/server",
  "@/lib/supabase/proxy",
  // Prisma is server-only (ADR-05 §4.1 #1): the client + generated code must
  // never reach the browser bundle.
  "@/lib/prisma",
  "prisma/generated",
] as const;

// Layer rules from .agents/doctrine/architecture.md: dependencies flow downward only.
// `lib` and `server` must never import from `features` or `app`; `components` must
// never import from `features`, `app`, or `server`. Runtime modules only — test
// files may reach across layers for fixtures.
const LAYER_RULES = [
  { layer: "src/lib", forbidden: ["@/features", "@/app"] },
  { layer: "src/server", forbidden: ["@/features", "@/app", "@/components"] },
  { layer: "src/components", forbidden: ["@/features", "@/app", "@/server"] },
] as const;

// Known inversions slated for removal by the migration plan: Generation-1
// storefront modules (Phases 2 and 4), the lib/admin mutation layer that reaches
// up into the admin provider (Phases 3 and 7), and server code importing
// feature-owned types (Phase 5). This list only burns down — never add an
// entry; fix the import direction instead.
const LEGACY_INVERSION_ALLOWLIST = new Set([
  "src/lib/storefront/catalog-data.ts",
  "src/lib/catalogue.ts",
  "src/components/shop/shop-provider.tsx",
  "src/lib/admin/customers/customers-mutations.ts",
  "src/lib/admin/holds/holds-mutations.ts",
  "src/lib/admin/inventory/inventory-mutations.ts",
  "src/lib/admin/orders/orders-mutations.ts",
  "src/lib/admin/returns/returns-mutations.ts",
  "src/lib/admin/settings/settings-mutations.ts",
  "src/lib/admin/data/in-memory/admin-repositories.ts",
  "src/server/commerce/orders/account-orders.ts",
]);

// The walk over src/** is slow on cold filesystems; do it once for all checks
// and give the assertions a generous timeout.
const CHECK_TIMEOUT_MS = 120_000;
let cachedSourceFiles: string[] | undefined;
function sourceFiles(): string[] {
  cachedSourceFiles ??= collectSourceFiles(join(WORKSPACE_ROOT, "src"));
  return cachedSourceFiles;
}

function isTestFile(repoPath: string) {
  return /\.test\.tsx?$/.test(repoPath);
}

describe("server/client boundaries", () => {
  it(
    "does not import server-only modules from client components",
    () => {
      const violations = sourceFiles()
        .filter(isClientComponent)
        .flatMap((filePath) =>
          FORBIDDEN_CLIENT_IMPORTS.filter((importPath) => importsModule(filePath, importPath)).map(
            (importPath) => `${relative(WORKSPACE_ROOT, filePath)} imports ${importPath}`,
          ),
        );

      expect(violations).toEqual([]);
    },
    CHECK_TIMEOUT_MS,
  );

  it(
    "does not import upward across layers (lib/server/components -> features/app)",
    () => {
      const violations = LAYER_RULES.flatMap(({ layer, forbidden }) =>
        sourceFiles()
          .map((filePath) => relative(WORKSPACE_ROOT, filePath).replaceAll("\\", "/"))
          .filter((repoPath) => repoPath.startsWith(`${layer}/`))
          .filter((repoPath) => !isTestFile(repoPath))
          .filter((repoPath) => !LEGACY_INVERSION_ALLOWLIST.has(repoPath))
          .flatMap((repoPath) =>
            forbidden
              .filter((importPath) => importsModule(join(WORKSPACE_ROOT, repoPath), importPath))
              .map((importPath) => `${repoPath} imports ${importPath}`),
          ),
      );

      expect(violations).toEqual([]);
    },
    CHECK_TIMEOUT_MS,
  );

  it(
    "keeps the legacy inversion allowlist honest (entries must still exist and offend)",
    () => {
      const stale = [...LEGACY_INVERSION_ALLOWLIST].filter((repoPath) => {
        const rule = LAYER_RULES.find(({ layer }) => repoPath.startsWith(`${layer}/`));
        if (!rule) return true;
        try {
          return !rule.forbidden.some((importPath) =>
            importsModule(join(WORKSPACE_ROOT, repoPath), importPath),
          );
        } catch {
          return true; // file deleted — remove it from the allowlist
        }
      });

      expect(stale).toEqual([]);
    },
    CHECK_TIMEOUT_MS,
  );
});

function collectSourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const fullPath = join(directory, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      return collectSourceFiles(fullPath);
    }

    return /\.(ts|tsx)$/.test(entry) ? [fullPath] : [];
  });
}

function isClientComponent(filePath: string) {
  const source = readFileSync(filePath, "utf8").trimStart();
  return source.startsWith('"use client";') || source.startsWith("'use client';");
}

function importsModule(filePath: string, importPath: string) {
  const source = readFileSync(filePath, "utf8");
  return source.includes(`"${importPath}`) || source.includes(`'${importPath}`);
}
