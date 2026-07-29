import { existsSync, readdirSync, readFileSync } from "node:fs";
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

  it("keeps the trusted Supabase admin client server-only", () => {
    const violations = sourceFiles(join(root, "src"))
      .filter((file) => readFileSync(file, "utf8").includes("@/lib/supabase/admin"))
      .filter((file) => readFileSync(file, "utf8").trimStart().startsWith('"use client"'))
      .map((file) => relative(root, file).replaceAll("\\", "/"));

    expect(violations).toEqual([]);
  });

  it("keeps the trusted Supabase admin client out of the auth security UI", () => {
    const violations = sourceFiles(authUiRoot)
      .filter((file) => readFileSync(file, "utf8").includes("@/lib/supabase/admin"))
      .map((file) => relative(root, file).replaceAll("\\", "/"));

    expect(violations).toEqual([]);
  });

  it("never exposes the trusted Supabase admin client from account security Route Handlers", () => {
    // Account security (email/password/MFA/session-management) never needs the
    // secret-key-backed admin client: every operation runs against the caller's
    // own authenticated server session. See
    // docs/architecture-migration/account-security-supabase-contract.md §5.
    const securityRoot = join(root, "src/app/api/v1/account/security");
    const violations = existsSync(securityRoot)
      ? sourceFiles(securityRoot)
          .filter((file) => readFileSync(file, "utf8").includes("@/lib/supabase/admin"))
          .map((file) => relative(root, file).replaceAll("\\", "/"))
      : [];

    expect(violations).toEqual([]);
  });

  it("keeps the auth module structure concrete rather than aspirational", () => {
    const required = [
      "src/app/auth/email/route.ts",
      "src/app/auth/invite/finalize/route.ts",
      "src/app/auth/invite/setup/page.tsx",
      "src/app/auth/oauth-complete/page.tsx",
      "src/modules/auth/errors.ts",
      "src/modules/auth/server/authenticate.ts",
      "src/modules/auth/server/session.ts",
      "src/modules/auth/server/account-provisioning.ts",
      "src/modules/auth/server/staff-invitations.ts",
      "src/modules/auth/ui/auth-email-form.tsx",
      "src/modules/auth/ui/auth-page-shell.tsx",
      "src/modules/auth/ui/google-oauth-button.tsx",
      "src/modules/auth/ui/google-oauth-popup.ts",
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
      "src/app/auth/email/route.ts",
      "src/app/auth/invite/finalize/route.ts",
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
