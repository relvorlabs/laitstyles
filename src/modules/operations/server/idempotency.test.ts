import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  claimIdempotency,
  completeIdempotency,
  failIdempotency,
} from "@/modules/operations/server/idempotency";

// Real Postgres round-trips through a hosted pooler; the first connection in
// this worker can exceed Vitest's 5s default, independent of the module's
// own concurrency behaviour under test.
vi.setConfig({ testTimeout: 20_000 });

const createdIds: string[] = [];

afterEach(async () => {
  if (!createdIds.length) return;
  await prisma.idempotency_records.deleteMany({ where: { id: { in: createdIds } } });
  createdIds.length = 0;
});

function scope(name: string): string {
  return `test.${name}.${randomUUID()}`;
}

describe("claimIdempotency / completeIdempotency", () => {
  it("claims a new scope/key pair for the first request", async () => {
    const claim = await claimIdempotency(scope("checkout"), "key-1", "customer-1", "hash-a");
    createdIds.push(claim.id);

    expect(claim.state).toBe("claimed");
  });

  it("returns the completed response for an identical replay", async () => {
    const testScope = scope("checkout");
    const first = await claimIdempotency(testScope, "key-1", "customer-1", "hash-a");
    createdIds.push(first.id);
    await completeIdempotency(first.id, { checkoutId: "checkout-1" });

    await expect(
      claimIdempotency(testScope, "key-1", "customer-1", "hash-a"),
    ).resolves.toMatchObject({ state: "completed", response: { checkoutId: "checkout-1" } });
  });

  it("rejects reuse with a different payload hash", async () => {
    const testScope = scope("refund");
    const first = await claimIdempotency(testScope, "key-2", "admin-1", "hash-a");
    createdIds.push(first.id);

    await expect(claimIdempotency(testScope, "key-2", "admin-1", "hash-b")).rejects.toMatchObject({
      code: "IDEMPOTENCY_CONFLICT",
    });
  });

  it("rejects reuse by a different actor even with the same payload hash", async () => {
    const testScope = scope("refund");
    const first = await claimIdempotency(testScope, "key-3", "admin-1", "hash-a");
    createdIds.push(first.id);

    await expect(claimIdempotency(testScope, "key-3", "admin-2", "hash-a")).rejects.toMatchObject({
      code: "IDEMPOTENCY_CONFLICT",
    });
  });

  it("reports in-progress state for a concurrent claim on the same key", async () => {
    const testScope = scope("payout");
    const first = await claimIdempotency(testScope, "key-4", "actor-1", "hash-a");
    createdIds.push(first.id);

    await expect(
      claimIdempotency(testScope, "key-4", "actor-1", "hash-a"),
    ).resolves.toMatchObject({ id: first.id, state: "in_progress" });
  });

  it("never lets more than one concurrent caller claim the same scope/key", async () => {
    const testScope = scope("checkout-concurrent");
    const attempts = await Promise.all(
      Array.from({ length: 8 }, () =>
        claimIdempotency(testScope, "key-5", "customer-1", "hash-a"),
      ),
    );
    createdIds.push(...new Set(attempts.map((attempt) => attempt.id)));

    expect(new Set(attempts.map((attempt) => attempt.id)).size).toBe(1);
    expect(attempts.filter((attempt) => attempt.state === "claimed")).toHaveLength(1);
    expect(attempts.filter((attempt) => attempt.state === "in_progress")).toHaveLength(7);
  });

  it("allows a retry after a failed attempt with the same payload hash", async () => {
    const testScope = scope("checkout-retry");
    const first = await claimIdempotency(testScope, "key-6", "customer-1", "hash-a");
    createdIds.push(first.id);
    await failIdempotency(first.id);

    await expect(
      claimIdempotency(testScope, "key-6", "customer-1", "hash-a"),
    ).resolves.toMatchObject({ id: first.id, state: "claimed" });
  });
});
