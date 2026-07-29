import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";

describe("payment persistence boundary", () => {
  it("exposes idempotent payment and payout records", () => {
    expect(prisma.payment_authorizations).toBeDefined();
    expect(prisma.payment_refunds).toBeDefined();
    expect(prisma.provider_webhook_events).toBeDefined();
    expect(prisma.payment_disputes).toBeDefined();
    expect(prisma.payout_recipients).toBeDefined();
    expect(prisma.payout_transfers).toBeDefined();
    expect(prisma.provider_settlements).toBeDefined();
    expect(prisma.idempotency_records).toBeDefined();
    expect(prisma.outbox_messages).toBeDefined();
  });
});
