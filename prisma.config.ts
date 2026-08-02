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
  // Prisma owns only the application schema. Supabase owns auth and all auth-side
  // triggers, functions and lifecycle behavior.
  schema: "prisma",
  migrations: {
    path: "prisma/migrations",
    // Prisma 7 does not automatically seed after migrate dev/reset. Keep
    // deterministic development seeding explicit through the repository script.
  },
  // These tables are created and constrained by checked-in SQL migrations. Their
  // models remain available to Prisma Client, while future Prisma Migrate diffs must
  // not infer away SQL-owned foreign keys and integrity rules.
  experimental: {
    externalTables: true,
  },
  tables: {
    external: ["public.product_variant_measurements", "public.customer_recent_products"],
  },
  // DB commands use the direct/session-pooler URL when configured. The runtime
  // Prisma client continues to use DATABASE_URL in src/lib/prisma/client.ts.
  ...(datasourceUrl ? { datasource: { url: datasourceUrl } } : {}),
});
