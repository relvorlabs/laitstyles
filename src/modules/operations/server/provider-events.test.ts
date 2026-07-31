import { randomUUID } from "node:crypto";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { receiveProviderEvent } from "@/modules/operations/server/provider-events";
import type { ProviderEventInput } from "@/modules/operations/types";
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

afterEach(async () => {
  if (!createdIds.length) return;
  await prisma.provider_webhook_events.deleteMany({ where: { id: { in: createdIds } } });
  createdIds.length = 0;
});

function baseInput(overrides: Partial<ProviderEventInput> = {}): ProviderEventInput {
  return {
    provider: "paystack",
    eventId: `evt-${randomUUID()}`,
    eventType: "charge.success",
    signature: "sig-a",
    payload: { reference: "ref-1" },
    ...overrides,
  };
}

describePersistence("receiveProviderEvent", () => {
  beforeAll(() => {
    assertDisposableAcceptanceDatabase();
  });

  it("persists a new event on first receipt", async () => {
    const input = baseInput();
    const result = await receiveProviderEvent(input);
    createdIds.push(result.id);

    expect(result.status).toBe("new");
    const stored = await prisma.provider_webhook_events.findUniqueOrThrow({
      where: { id: result.id },
    });
    expect(stored).toMatchObject({
      provider: "paystack",
      event_id: input.eventId,
      event_type: "charge.success",
      signature: "sig-a",
      status: "received",
      payload: { reference: "ref-1" },
      attempts: 0,
    });
  });

  it("reports duplicate for a redelivered event with a matching signature", async () => {
    const input = baseInput();
    const first = await receiveProviderEvent(input);
    createdIds.push(first.id);

    const second = await receiveProviderEvent(input);

    expect(second).toMatchObject({ status: "duplicate", id: first.id });
    const stored = await prisma.provider_webhook_events.findUniqueOrThrow({
      where: { id: first.id },
    });
    expect(stored.attempts).toBe(1);
  });

  it("reports conflict for the same dedupe key with a different signature", async () => {
    const input = baseInput();
    const first = await receiveProviderEvent(input);
    createdIds.push(first.id);

    const conflicting = await receiveProviderEvent({
      ...input,
      signature: "sig-b",
      payload: { reference: "tampered" },
    });

    expect(conflicting).toMatchObject({ status: "conflict", id: first.id });
    const stored = await prisma.provider_webhook_events.findUniqueOrThrow({
      where: { id: first.id },
    });
    expect(stored.signature).toBe("sig-a");
  });

  it("treats the same event id from different providers as distinct events", async () => {
    const eventId = `evt-${randomUUID()}`;
    const paystack = await receiveProviderEvent(baseInput({ eventId, provider: "paystack" }));
    createdIds.push(paystack.id);
    const manual = await receiveProviderEvent(baseInput({ eventId, provider: "manual" }));
    createdIds.push(manual.id);

    expect(paystack.status).toBe("new");
    expect(manual.status).toBe("new");
    expect(paystack.id).not.toBe(manual.id);
  });

  it("dedupes concurrent redeliveries of the same event to a single stored row", async () => {
    const input = baseInput();
    const results = await Promise.all(Array.from({ length: 6 }, () => receiveProviderEvent(input)));
    createdIds.push(...new Set(results.map((result) => result.id)));

    expect(new Set(results.map((result) => result.id)).size).toBe(1);
    expect(results.filter((result) => result.status === "new")).toHaveLength(1);
    expect(results.filter((result) => result.status === "duplicate")).toHaveLength(5);
  });
});
