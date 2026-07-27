import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const appAuthRoot = join(root, "src/app/auth");
const authUiRoot = join(root, "src/modules/auth/ui");

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(absolute);
    return /\.[cm]?[jt]sx?$/.test(entry.name) && !/\.test\./.test(entry.name) ? [absolute] : [];
  });
}

describe("auth ownership boundaries", () => {
  it("keeps Supabase provider access out of app/auth adapters", () => {
    const violations = sourceFiles(appAuthRoot)
      .filter((file) => readFileSync(file, "utf8").includes("@/lib/supabase/server"))
      .map((file) => relative(root, file).replaceAll("\\", "/"));

    expect(violations).toEqual([]);
  });

  it("keeps client auth UI away from server-only auth modules", () => {
    const violations = sourceFiles(authUiRoot)
      .filter((file) => readFileSync(file, "utf8").trimStart().startsWith('"use client"'))
      .filter((file) => readFileSync(file, "utf8").includes("@/modules/auth/server/"))
      .map((file) => relative(root, file).replaceAll("\\", "/"));

    expect(violations).toEqual([]);
  });

  it("keeps the auth module structure concrete rather than aspirational", () => {
    const required = [
      "src/modules/auth/errors.ts",
      "src/modules/auth/server/authenticate.ts",
      "src/modules/auth/server/session.ts",
      "src/modules/auth/server/account-provisioning.ts",
      "src/modules/auth/ui/auth-email-form.tsx",
      "src/modules/auth/ui/auth-page-shell.tsx",
      "src/modules/auth/ui/reset-password-form.tsx",
      "src/modules/auth/ui/sign-in-form.tsx",
      "src/modules/auth/ui/sign-up-form.tsx",
    ];

    expect(required.filter((path) => !existsSync(join(root, path)))).toEqual([]);
  });

  it("keeps browser routes as thin auth-module adapters", () => {
    const routes = [
      "src/app/auth/google/route.ts",
      "src/app/auth/callback/route.ts",
      "src/app/auth/sign-out/route.ts",
    ];

    for (const path of routes) {
      const source = readFileSync(join(root, path), "utf8");
      expect(source).toContain("@/modules/auth/server/");
      expect(source).not.toContain("createClient(");
      expect(source).not.toContain("supabase.auth.");
    }
  });
});
