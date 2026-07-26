import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import {
  legacyArchitectureExceptions,
  legacyTopLevelServerFiles,
} from "../../../scripts/checks/architecture-legacy-exceptions.mjs";

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

const compatibilityEdges = new Set(
  legacyArchitectureExceptions.map((entry) => `${entry.importer}->${entry.imported}`),
);

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
          .flatMap((repoPath) =>
            forbidden
              .filter((importPath) => importsModule(join(WORKSPACE_ROOT, repoPath), importPath))
              .filter(
                (importPath) =>
                  !legacyArchitectureExceptions.some(
                    (entry) =>
                      entry.importer === repoPath &&
                      entry.imported.startsWith(importPath) &&
                      importsModule(join(WORKSPACE_ROOT, repoPath), entry.imported),
                  ),
              )
              .map((importPath) => `${repoPath} imports ${importPath}`),
          ),
      );

      expect(violations).toEqual([]);
    },
    CHECK_TIMEOUT_MS,
  );

  it(
    "keeps compatibility exceptions exact, immutable, owned and scheduled",
    () => {
      expect(Object.isFrozen(legacyArchitectureExceptions)).toBe(true);
      expect(legacyArchitectureExceptions.every((entry) => Object.isFrozen(entry))).toBe(true);
      expect(
        legacyArchitectureExceptions.every(
          (entry) =>
            entry.importer.length > 0 &&
            entry.imported.length > 0 &&
            (entry.removalPhase === 7 || entry.removalPhase === 8) &&
            (entry.owner === "domain-engineer" || entry.owner === "ui-engineer"),
        ),
      ).toBe(true);
      expect(compatibilityEdges.size).toBe(legacyArchitectureExceptions.length);
      expect([...legacyTopLevelServerFiles]).toEqual([
        "src/server/auth/session.ts",
        "src/server/auth/profile.ts",
      ]);
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
