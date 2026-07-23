import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

loadEnv({ path: ".env.local" });

const candidateUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const datasourceUrl =
  candidateUrl?.startsWith("postgresql://") || candidateUrl?.startsWith("postgres://")
    ? candidateUrl
    : null;

export default defineConfig({
  schema: "prisma",
  migrations: {
    path: "prisma/migrations",
    initShadowDb: `
         CREATE SCHEMA IF NOT EXISTS auth;

         CREATE TABLE IF NOT EXISTS auth.users (
           id uuid PRIMARY KEY
         );
       `,
  },
  ...(datasourceUrl ? { datasource: { url: datasourceUrl } } : {}),
  experimental: {
    externalTables: true,
  },
  tables: {
    external: ["auth.users"],
  },
});
