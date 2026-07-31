import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { includeSupabaseAuthSchema } from "../../../scripts/db/prisma-schema-input.mjs";

const root = process.cwd();
const config = readFileSync(resolve(root, "prisma.config.ts"), "utf8");
const packageJson = readFileSync(resolve(root, "package.json"), "utf8");
const paymentOperations = readFileSync(
  resolve(root, "prisma/payment-operations.prisma"),
  "utf8",
);
const authBridgeMigration = readFileSync(
  resolve(
    root,
    "prisma/migrations/20260724121500_supabase_auth_profile_bridge/migration.sql",
  ),
  "utf8",
);
const signatureMigration = readFileSync(
  resolve(
    root,
    "prisma/migrations/20260730113000_payment_authorization_signature_owner/migration.sql",
  ),
  "utf8",
);

describe("Plan 05 Prisma payment contracts", () => {
  it("adds Supabase Auth only to the database-facing Prisma input", () => {
    const source = 'datasource db {\n  provider = "postgresql"\n  schemas  = ["public"]\n}\n';
    const prepared = includeSupabaseAuthSchema(source);

    expect(prepared).toContain('schemas  = ["public", "auth"]');
    expect(includeSupabaseAuthSchema(prepared)).toBe(prepared);
    expect(config).toContain('schema: process.env.PRISMA_SCHEMA_INPUT ?? "prisma"');
    expect(config).toContain('external: ["auth.users", "public.product_variant_measurements"]');
    expect(config).toContain("CREATE TABLE IF NOT EXISTS auth.users");
    expect(packageJson).toContain(
      '"prisma:migrate:dev": "node scripts/db/run-prisma.mjs migrate dev && pnpm prisma:generate"',
    );
  });

  it("models every auth.users column referenced while migrations replay in shadow", () => {
    expect(authBridgeMigration).toContain("after update of email, raw_user_meta_data");
    expect(authBridgeMigration).toContain("new.email");
    expect(authBridgeMigration).toContain("new.raw_user_meta_data");
    expect(config).toContain("email text");
    expect(config).toContain("raw_user_meta_data jsonb NOT NULL DEFAULT '{}'::jsonb");
  });

  it("enforces one owner for each provider authorization signature", () => {
    expect(paymentOperations).toContain(
      '@@unique([provider, signature], map: "payment_authorizations_provider_signature_unique")',
    );
    expect(paymentOperations).not.toContain(
      "payment_authorizations_customer_provider_signature_unique",
    );
    expect(signatureMigration).toContain("count(DISTINCT customer_id) > 1");
    expect(signatureMigration).toContain(
      "CREATE UNIQUE INDEX payment_authorizations_provider_signature_unique",
    );
  });
});
