import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
// Single coupling point to the generated client. Nothing else in the app
// imports from prisma/generated/** — repositories import `prisma`/`Prisma`
// from here (or from "@/lib/prisma"). Server-only: never reaches the browser.
import { Prisma, PrismaClient } from "../../../prisma/generated/prisma/client";

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
    // conservative pool for serverless/pooled runtime
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
  return new PrismaClient({ adapter });
}

// Hot-reload-safe singleton in dev; fresh in prod.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
