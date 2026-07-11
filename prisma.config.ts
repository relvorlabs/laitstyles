import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Next.js loads `.env.local` automatically, but the Prisma CLI does not — load
// it explicitly so introspection/migration use the same secrets as the app.
loadEnv({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // CLI/introspection/migration use the direct (session-pooler) connection.
  // The runtime Prisma Client connects via the pg driver adapter using
  // DATABASE_URL (transaction pooler) — see src/lib/prisma/client.ts.
  datasource: {
    url: env("DIRECT_URL"),
  },
});
