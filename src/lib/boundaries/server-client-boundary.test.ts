import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { classifyArchitectureGraph } from "../../../scripts/checks/architecture-guard.mjs";
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
  it("classifies executable imports without treating comments as dependencies", () => {
    const files = {
      "src/client.tsx": `
        "use client";
        // import { secret } from "@/modules/orders/server/queries";
        import {
          listOrders,
        } from "@/modules/orders/server/queries";
      `,
      "src/modules/orders/server/queries.ts": 'import "server-only"; export const listOrders = 1;',
    };

    expect(classifyArchitectureGraph({ files })).toEqual([
      {
        rule: "client-server-import",
        importer: "src/client.tsx",
        imported: "@/modules/orders/server/queries",
        detail: "Client module imports server runtime src/modules/orders/server/queries.ts.",
      },
    ]);
  });

  it("follows relative and re-exported Server Action imports", () => {
    const files = {
      "src/features/query.ts": `
        import { useQuery } from "@tanstack/react-query";
        import { save } from "../app/actions";
        export const query = useQuery({ queryKey: ["save"], queryFn: save });
      `,
      "src/app/actions.ts": '"use server"; export async function save() {}',
      "src/app/api/v1/items/route.ts": 'import { save } from "../../../actions-index";',
      "src/app/actions-index.ts": 'export { save } from "./actions";',
    };

    expect(classifyArchitectureGraph({ files })).toEqual([
      {
        rule: "route-handler-server-action",
        importer: "src/app/api/v1/items/route.ts",
        imported: "src/app/actions-index.ts",
        detail: "Route Handler imports a Server Action through a re-export.",
      },
      {
        rule: "tanstack-server-action",
        importer: "src/features/query.ts",
        imported: "src/app/actions.ts",
        detail: "TanStack module imports a Server Action.",
      },
    ]);
  });

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
                  !(
                    layer === "src/modules" && onlyImportsServerActionsFromApp(repoPath, importPath)
                  ),
              )
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
            ([7, 8] as const).includes(entry.removalPhase) &&
            (["domain-engineer", "ui-engineer"] as const).includes(entry.owner),
        ),
      ).toBe(true);
      expect(compatibilityEdges.size).toBe(legacyArchitectureExceptions.length);
      expect([...legacyTopLevelServerFiles]).toEqual([]);
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

// A Client Component (including a domain module's ui/** layer) calling a thin
// Server Action imperatively is a sanctioned flow ("Form or Client Component
// -> thin Server Action -> domain command"), distinct from the prohibited
// patterns (TanStack Query wrapping a Server Action, Route Handlers importing
// one) that classifyArchitectureGraph already catches above. src/modules may
// therefore import @/app specifically when every such import resolves to a
// "use server" module - never for other app-layer code.
function resolveAliasSpecifier(specifier: string): string | null {
  if (!specifier.startsWith("@/")) return null;
  const base = join(WORKSPACE_ROOT, "src", specifier.slice(2));
  for (const candidate of [`${base}.ts`, `${base}.tsx`, join(base, "index.ts")]) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function isServerActionModule(specifier: string): boolean {
  const resolved = resolveAliasSpecifier(specifier);
  if (!resolved) return false;
  return readFileSync(resolved, "utf8").trimStart().startsWith('"use server"');
}

function exactImportSpecifiers(source: string): string[] {
  return [...source.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)].map((match) => match[1]);
}

function onlyImportsServerActionsFromApp(repoPath: string, importPath: string): boolean {
  if (importPath !== "@/app") return false;
  const source = readFileSync(join(WORKSPACE_ROOT, repoPath), "utf8");
  const appSpecifiers = exactImportSpecifiers(source).filter((specifier) =>
    specifier.startsWith("@/app"),
  );
  return appSpecifiers.length > 0 && appSpecifiers.every(isServerActionModule);
}

function importsModule(filePath: string, importPath: string) {
  const source = readFileSync(filePath, "utf8");
  return source.includes(`"${importPath}`) || source.includes(`'${importPath}`);
}
