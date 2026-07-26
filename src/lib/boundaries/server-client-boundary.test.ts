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
  "@/lib/prisma",
  "prisma/generated",
] as const;

// Dependency direction is a principle, not a list of required legacy files.
const LAYER_RULES = [
  { layer: "src/lib", forbidden: ["@/features", "@/app"] },
  { layer: "src/server", forbidden: ["@/features", "@/app", "@/components"] },
  { layer: "src/components", forbidden: ["@/features", "@/app", "@/server"] },
  { layer: "src/modules", forbidden: ["@/features", "@/app", "@/server"] },
] as const;

// These are unrelated pre-existing admin migration exceptions. New entries are
// prohibited; this repair removes an entry whenever its owner moves.
const DOCUMENTED_PREEXISTING_EXCEPTIONS = new Set([
  "src/lib/admin/customers/customers-mutations.ts",
  "src/lib/admin/holds/holds-mutations.ts",
  "src/lib/admin/orders/orders-mutations.ts",
  "src/lib/admin/returns/returns-mutations.ts",
  "src/lib/admin/settings/settings-mutations.ts",
  "src/lib/admin/data/in-memory/admin-repositories.ts",
]);

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
    "keeps infrastructure, components and domain modules from importing upward",
    () => {
      const violations = LAYER_RULES.flatMap(({ layer, forbidden }) =>
        sourceFiles()
          .map((filePath) => relative(WORKSPACE_ROOT, filePath).replaceAll("\\", "/"))
          .filter((repoPath) => repoPath.startsWith(`${layer}/`))
          .filter((repoPath) => !isTestFile(repoPath))
          .filter((repoPath) => !DOCUMENTED_PREEXISTING_EXCEPTIONS.has(repoPath))
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
    "keeps documented pre-existing exceptions honest",
    () => {
      const stale = [...DOCUMENTED_PREEXISTING_EXCEPTIONS].filter((repoPath) => {
        const rule = LAYER_RULES.find(({ layer }) => repoPath.startsWith(`${layer}/`));
        if (!rule) return true;
        try {
          return !rule.forbidden.some((importPath) =>
            importsModule(join(WORKSPACE_ROOT, repoPath), importPath),
          );
        } catch {
          return true;
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

    if (stat.isDirectory()) return collectSourceFiles(fullPath);
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
