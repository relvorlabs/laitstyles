import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// Next.js loads `.env.local` automatically, but the Prisma CLI does not — load
// it explicitly so introspection/migration use the same secrets as the app.
loadEnv({ path: ".env.local" });

// `prisma generate` does not need a database connection. Vercel may expose stale,
// missing, or secret-reference values during dependency installation, so only pass a
// datasource URL to Prisma CLI commands when it is an actual PostgreSQL connection.
const candidateUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const datasourceUrl =
  candidateUrl?.startsWith("postgresql://") || candidateUrl?.startsWith("postgres://")
    ? candidateUrl
    : null;

export default defineConfig({
  // Database-facing wrappers point Prisma at a temporary combined schema that
  // includes Supabase's auth namespace for cross-schema FK validation.
  schema: process.env.PRISMA_SCHEMA_INPUT ?? "prisma",
  migrations: {
    path: "prisma/migrations",
    // Supabase owns auth.users. Prisma still needs the referenced table in its
    // disposable shadow database because a reviewed SQL migration creates the
    // public.profiles -> auth.users foreign key. The bridge migration also installs
    // an UPDATE OF trigger, so every referenced trigger column must exist here.
    initShadowDb: `
      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE TABLE IF NOT EXISTS auth.users (
        id uuid PRIMARY KEY,
        email text,
        raw_user_meta_data jsonb NOT NULL DEFAULT '{}'::jsonb
      );
    `,
  },
  experimental: {
    externalTables: true,
  },
  tables: {
    external: ["auth.users", "public.product_variant_measurements"],
  },
  // DB commands use the direct/session-pooler URL when configured. The runtime
  // Prisma client continues to use DATABASE_URL in src/lib/prisma/client.ts.
  ...(datasourceUrl ? { datasource: { url: datasourceUrl } } : {}),
});
