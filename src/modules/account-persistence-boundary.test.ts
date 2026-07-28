import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";

describe("account persistence boundary", () => {
  it("exposes every approved account delegate", () => {
    expect(prisma.customer_preferences).toBeDefined();
    expect(prisma.notification_preferences).toBeDefined();
    expect(prisma.notifications).toBeDefined();
    expect(prisma.support_tickets).toBeDefined();
    expect(prisma.data_export_jobs).toBeDefined();
    expect(prisma.account_deletion_requests).toBeDefined();
  });
});
