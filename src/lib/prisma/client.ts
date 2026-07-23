import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
// Single coupling point to the generated client. Nothing else in the app
// imports from src/generated/** — repositories import `prisma`/`Prisma`
// from here (or from "@/lib/prisma"). Server-only: never reaches the browser.
import { Prisma, PrismaClient } from "../../generated/prisma/client";

export type { PrismaClient };
export { Prisma };

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set — cannot create the Prisma client.");
  }

  // Prisma 7 requires a driver adapter. Runtime connects via the pg pooler
  // (DATABASE_URL, transaction pooler). Pool options are set explicitly because
  // the pg driver has no default connection timeout.
  const adapter = new PrismaPg({
    connectionString,
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
let modulePrisma: PrismaClient | undefined;

function getPrismaClient(): PrismaClient {
  const existing = globalForPrisma.prisma ?? modulePrisma;
  if (existing) return existing;

  const client = createPrismaClient();
  modulePrisma = client;

  // Preserve one client across Fast Refresh in development. Production keeps the
  // module-local singleton for the lifetime of the serverless/function instance.
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }

  return client;
}

// Next.js imports server modules while collecting route configuration and page data.
// Deferring client construction until the first Prisma property is actually used lets
// dynamic routes build without DATABASE_URL, while real runtime queries still produce
// the explicit configuration error above when the deployment is misconfigured.
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getPrismaClient();
    const value = Reflect.get(client, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
