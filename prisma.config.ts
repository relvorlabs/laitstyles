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
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // Dev-only deterministic seed (docs/storefront-v2/06 Phase 1). Runs automatically
    // after `prisma migrate dev` / `prisma migrate reset`, or on demand via `prisma db seed`.
    // seed: "tsx scripts/seed/seed-storefront.ts",
  },
  // DB commands use the direct/session-pooler URL when configured. The runtime
  // Prisma client continues to use DATABASE_URL in src/lib/prisma/client.ts.
  ...(datasourceUrl ? { datasource: { url: datasourceUrl } } : {}),
});
