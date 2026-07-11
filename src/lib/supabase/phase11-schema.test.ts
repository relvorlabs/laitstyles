import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  join(process.cwd(), "supabase/migrations/20260711011201_phase11_identity_cloudinary_assets.sql"),
  "utf8",
).toLowerCase();
const supabaseConfig = readFileSync(
  join(process.cwd(), "supabase/config.toml"),
  "utf8",
).toLowerCase();

describe("phase 11 supabase schema guardrails", () => {
  it("keeps owner memberships CLI-only at the database layer", () => {
    expect(migrationSql).toContain("store_memberships_owner_cli_only");
    expect(migrationSql).toContain("role <> 'owner' or created_by_cli");
    expect(migrationSql).toContain(
      "owner memberships must be created by the service-role cli bootstrap",
    );
  });

  it("stores cloudinary image metadata instead of supabase image blobs", () => {
    expect(migrationSql).toContain("create table public.cloudinary_assets");
    expect(migrationSql).toContain(
      "provider text not null default 'cloudinary' check (provider = 'cloudinary')",
    );
    expect(migrationSql).toContain(
      "secure_url text not null check (secure_url like 'https://res.cloudinary.com/%')",
    );
    expect(migrationSql).not.toMatch(/\bstorage\.buckets\b/);
    expect(migrationSql).not.toMatch(/\bstorage\.objects\b/);
    expect(migrationSql).not.toMatch(/\bbytea\b/);
    expect(supabaseConfig).toContain("[storage]\nenabled = false");
    expect(supabaseConfig).not.toContain("[storage.buckets");
  });
});
