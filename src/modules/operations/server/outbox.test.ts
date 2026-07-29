import { randomUUID } from "node:crypto";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { enqueueOutbox } from "@/modules/operations/server/outbox";
import { assertDisposableAcceptanceDatabase } from "@/test/persistence-harness";

// Real Postgres round-trips through a hosted pooler; the first connection in
// this worker can exceed Vitest's 5s default, independent of the module's
// own concurrency behaviour under test.
vi.setConfig({ testTimeout: 20_000 });

// These tests write directly through the real Prisma client (no fixtures),
// so they must never run against a database that isn't disposable. See
// src/modules/products/server/product-persistence.test.ts for the pattern.
const acceptanceDatabaseEnabled = process.env.LAITSTYLES_ACCEPTANCE_DATABASE === "1";
const describePersistence = acceptanceDatabaseEnabled ? describe : describe.skip;

const createdIds: string[] = [];

// The interactive-transaction connection-pool wait, distinct from the test
// timeout above: a hosted pooler can take longer than Prisma's 2s default
// `maxWait` to hand a worker its first connection under concurrent load.
const transactionOptions = { maxWait: 15_000, timeout: 15_000 };

afterEach(async () => {
  if (!createdIds.length) return;
  await prisma.outbox_messages.deleteMany({ where: { id: { in: createdIds } } });
  createdIds.length = 0;
});

describePersistence("enqueueOutbox", () => {
  beforeAll(() => {
    assertDisposableAcceptanceDatabase();
  });

  it("persists a pending message through the supplied transaction client", async () => {
    const topic = `test.topic.${randomUUID()}`;
    const { id } = await prisma.$transaction(
      (tx) => enqueueOutbox(tx, { topic, payload: { orderId: "order-1" } }),
      transactionOptions,
    );
    createdIds.push(id);

    const stored = await prisma.outbox_messages.findUniqueOrThrow({ where: { id } });
    expect(stored).toMatchObject({
      topic,
      status: "pending",
      payload: { orderId: "order-1" },
      attempts: 0,
    });
  });

  it("rolls the outbox message back with the rest of the enclosing transaction", async () => {
    const topic = `test.topic.${randomUUID()}`;

    await expect(
      prisma.$transaction(async (tx) => {
        await enqueueOutbox(tx, { topic, payload: { orderId: "order-2" } });
        throw new Error("simulated business failure after enqueue");
      }, transactionOptions),
    ).rejects.toThrow("simulated business failure after enqueue");

    const stored = await prisma.outbox_messages.findFirst({ where: { topic } });
    expect(stored).toBeNull();
  });

  it("honours an explicit availableAt for deferred delivery", async () => {
    const topic = `test.topic.${randomUUID()}`;
    const availableAt = new Date(Date.now() + 60_000);
    const { id } = await prisma.$transaction(
      (tx) => enqueueOutbox(tx, { topic, payload: {}, availableAt }),
      transactionOptions,
    );
    createdIds.push(id);

    const stored = await prisma.outbox_messages.findUniqueOrThrow({ where: { id } });
    expect(stored.available_at.getTime()).toBe(availableAt.getTime());
  });
});
