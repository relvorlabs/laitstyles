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

describe("server/client boundaries", () => {
  it("does not import server-only modules from client components", () => {
    const violations = collectSourceFiles(join(WORKSPACE_ROOT, "src"))
      .filter(isClientComponent)
      .flatMap((filePath) =>
        FORBIDDEN_CLIENT_IMPORTS.filter((importPath) => importsModule(filePath, importPath)).map(
          (importPath) => `${relative(WORKSPACE_ROOT, filePath)} imports ${importPath}`,
        ),
      );

    expect(violations).toEqual([]);
  });
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
