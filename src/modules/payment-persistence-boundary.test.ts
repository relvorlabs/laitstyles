import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { assertDisposableAcceptanceDatabase } from "@/test/persistence-harness";

// This only reads static properties off the generated Prisma client (no
// query is issued), so it never touches the database. It is still gated
// behind the acceptance-database guard for consistency with every other
// test in this suite that imports `prisma`: the module-level Proxy in
// src/lib/prisma/client.ts throws immediately if DATABASE_URL is unset, so
// gating avoids a hard crash when the acceptance database isn't configured.
const acceptanceDatabaseEnabled = process.env.LAITSTYLES_ACCEPTANCE_DATABASE === "1";
const describePersistence = acceptanceDatabaseEnabled ? describe : describe.skip;

describePersistence("payment persistence boundary", () => {
  beforeAll(() => {
    assertDisposableAcceptanceDatabase();
  });

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
