import "server-only";

import { Prisma, prisma } from "@/lib/prisma";

const MAX_SERIALIZABLE_ATTEMPTS = 3;

export function isSerializableConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}

/**
 * Runs `work` inside a Serializable transaction, retrying on Postgres
 * serialization failures (Prisma P2034) — an expected outcome under
 * Serializable isolation, not a real error.
 */
export async function runSerializable<T>(
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 1; attempt <= MAX_SERIALIZABLE_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 15_000,
        timeout: 15_000,
      });
    } catch (error) {
      if (!isSerializableConflict(error) || attempt === MAX_SERIALIZABLE_ATTEMPTS) throw error;
    }
  }
  throw new Error("Serializable transaction exhausted its retry budget.");
}
