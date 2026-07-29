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

describePersistence("account persistence boundary", () => {
  beforeAll(() => {
    assertDisposableAcceptanceDatabase();
  });

  it("exposes every approved account delegate", () => {
    expect(prisma.customer_preferences).toBeDefined();
    expect(prisma.notification_preferences).toBeDefined();
    expect(prisma.notifications).toBeDefined();
    expect(prisma.support_tickets).toBeDefined();
    expect(prisma.data_export_jobs).toBeDefined();
    expect(prisma.account_deletion_requests).toBeDefined();
  });
});
