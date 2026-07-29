import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deletionFindFirst: vi.fn(),
  deletionFindUnique: vi.fn(),
  deletionCreate: vi.fn(),
  deletionUpdate: vi.fn(),
  ordersFindFirst: vi.fn(),
  returnsFindFirst: vi.fn(),
  refundsFindFirst: vi.fn(),
  disputesFindFirst: vi.fn(),
  authorizationsFindFirst: vi.fn(),
  exportFindMany: vi.fn(),
  deleteArtifact: vi.fn(),
  transaction: vi.fn(),
  anonymize: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    account_deletion_requests: {
      findFirst: mocks.deletionFindFirst,
      findUnique: mocks.deletionFindUnique,
      create: mocks.deletionCreate,
      update: mocks.deletionUpdate,
    },
    orders: { findFirst: mocks.ordersFindFirst },
    returns: { findFirst: mocks.returnsFindFirst },
    payment_refunds: { findFirst: mocks.refundsFindFirst },
    payment_disputes: { findFirst: mocks.disputesFindFirst },
    payment_authorizations: { findFirst: mocks.authorizationsFindFirst },
    data_export_jobs: { findMany: mocks.exportFindMany },
    $transaction: mocks.transaction,
  },
}));

vi.mock("@/modules/account-lifecycle/server/anonymize", () => ({
  anonymizeCustomerData: mocks.anonymize,
}));

vi.mock("@/modules/account-lifecycle/server/artifacts", () => ({
  deleteAccountExportArtifact: mocks.deleteArtifact,
}));

import {
  cancelAccountDeletion,
  executeScheduledDeletion,
  requestAccountDeletion,
} from "@/modules/account-lifecycle/server/deletion";

const identity = {
  customerId: "11111111-1111-4111-8111-111111111111",
  authUserId: "22222222-2222-4222-8222-222222222222",
  email: "amara@example.com",
  displayName: "Amara",
  phone: null,
};
const now = new Date("2026-07-29T00:00:00.000Z");

function clearBlockers() {
  mocks.ordersFindFirst.mockResolvedValue(null);
  mocks.returnsFindFirst.mockResolvedValue(null);
  mocks.refundsFindFirst.mockResolvedValue(null);
  mocks.disputesFindFirst.mockResolvedValue(null);
  mocks.authorizationsFindFirst.mockResolvedValue(null);
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.deletionFindFirst.mockResolvedValue(null);
  mocks.exportFindMany.mockResolvedValue([]);
  mocks.deleteArtifact.mockResolvedValue(undefined);
  clearBlockers();
});

describe("requestAccountDeletion blockers", () => {
  it("blocks deletion for an active order", async () => {
    clearBlockers();
    mocks.ordersFindFirst.mockResolvedValue({ id: "order-1" });
    mocks.deletionCreate.mockResolvedValue({
      id: "req-1",
      status: "blocked",
      reason: null,
      requested_at: now,
      scheduled_for: null,
      cancelled_at: null,
      completed_at: null,
    });

    await expect(requestAccountDeletion(identity, {}, now)).rejects.toMatchObject({
      code: "ACCOUNT_DELETION_BLOCKED",
      blockedBy: "active-order",
    });
  });

  it("blocks deletion for an open return", async () => {
    clearBlockers();
    mocks.returnsFindFirst.mockResolvedValue({ id: "return-1" });
    mocks.deletionCreate.mockResolvedValue({
      id: "req-1",
      status: "blocked",
      reason: null,
      requested_at: now,
      scheduled_for: null,
      cancelled_at: null,
      completed_at: null,
    });

    await expect(requestAccountDeletion(identity, {}, now)).rejects.toMatchObject({
      code: "ACCOUNT_DELETION_BLOCKED",
      blockedBy: "open-return",
    });
  });

  it("blocks deletion for a pending refund", async () => {
    clearBlockers();
    mocks.refundsFindFirst.mockResolvedValue({ id: "refund-1" });
    mocks.deletionCreate.mockResolvedValue({
      id: "req-1",
      status: "blocked",
      reason: null,
      requested_at: now,
      scheduled_for: null,
      cancelled_at: null,
      completed_at: null,
    });

    await expect(requestAccountDeletion(identity, {}, now)).rejects.toMatchObject({
      code: "ACCOUNT_DELETION_BLOCKED",
      blockedBy: "pending-refund",
    });
  });

  it("blocks deletion for an open dispute", async () => {
    clearBlockers();
    mocks.disputesFindFirst.mockResolvedValue({ id: "dispute-1" });
    mocks.deletionCreate.mockResolvedValue({
      id: "req-1",
      status: "blocked",
      reason: null,
      requested_at: now,
      scheduled_for: null,
      cancelled_at: null,
      completed_at: null,
    });

    await expect(requestAccountDeletion(identity, {}, now)).rejects.toMatchObject({
      code: "ACCOUNT_DELETION_BLOCKED",
      blockedBy: "open-dispute",
    });
  });

  it("blocks deletion for a pending payout (unresolved payment-method verification)", async () => {
    clearBlockers();
    mocks.authorizationsFindFirst.mockResolvedValue({ id: "auth-1" });
    mocks.deletionCreate.mockResolvedValue({
      id: "req-1",
      status: "blocked",
      reason: null,
      requested_at: now,
      scheduled_for: null,
      cancelled_at: null,
      completed_at: null,
    });

    await expect(requestAccountDeletion(identity, {}, now)).rejects.toMatchObject({
      code: "ACCOUNT_DELETION_BLOCKED",
      blockedBy: "pending-payout",
    });
  });
});

describe("requestAccountDeletion", () => {
  it("schedules deletion 14 days out when nothing blocks it", async () => {
    clearBlockers();
    mocks.deletionCreate.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        id: "req-1",
        status: data.status,
        reason: data.reason,
        requested_at: data.requested_at,
        scheduled_for: data.scheduled_for,
        cancelled_at: null,
        completed_at: null,
      }),
    );

    const result = await requestAccountDeletion(identity, {}, now);

    expect(result.status).toBe("scheduled");
    const scheduledFor = new Date(result.scheduledFor as string);
    expect(scheduledFor.getTime() - now.getTime()).toBe(14 * 24 * 60 * 60 * 1_000);
  });

  it("returns the existing active request instead of creating a second one", async () => {
    mocks.deletionFindFirst.mockResolvedValue({
      id: "req-1",
      status: "scheduled",
      reason: null,
      requested_at: now,
      scheduled_for: new Date("2026-08-12T00:00:00.000Z"),
      cancelled_at: null,
      completed_at: null,
    });

    const result = await requestAccountDeletion(identity, {}, now);

    expect(result.id).toBe("req-1");
    expect(mocks.deletionCreate).not.toHaveBeenCalled();
  });
});

describe("cancelAccountDeletion", () => {
  it("cancels the active request", async () => {
    mocks.deletionFindFirst.mockResolvedValue({
      id: "req-1",
      status: "scheduled",
      reason: null,
      requested_at: now,
      scheduled_for: new Date("2026-08-12T00:00:00.000Z"),
      cancelled_at: null,
      completed_at: null,
    });
    mocks.deletionUpdate.mockResolvedValue({
      id: "req-1",
      status: "cancelled",
      reason: null,
      requested_at: now,
      scheduled_for: new Date("2026-08-12T00:00:00.000Z"),
      cancelled_at: now,
      completed_at: null,
    });

    const result = await cancelAccountDeletion(identity, now);

    expect(mocks.deletionUpdate).toHaveBeenCalledWith({
      where: { id: "req-1" },
      data: { status: "cancelled", cancelled_at: now },
    });
    expect(result.status).toBe("cancelled");
  });

  it("rejects cancelling when there is no active request", async () => {
    mocks.deletionFindFirst.mockResolvedValue(null);

    await expect(cancelAccountDeletion(identity, now)).rejects.toMatchObject({
      code: "ACCOUNT_DELETION_NOT_FOUND",
    });
  });
});

describe("executeScheduledDeletion", () => {
  it("anonymizes customer data and marks the request completed", async () => {
    clearBlockers();
    mocks.deletionFindUnique.mockResolvedValue({
      id: "req-1",
      customer_id: identity.customerId,
      status: "scheduled",
      scheduled_for: new Date("2026-07-28T00:00:00.000Z"),
    });
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback({
        account_deletion_requests: {
          update: vi.fn().mockResolvedValue({
            id: "req-1",
            status: "completed",
            reason: null,
            requested_at: now,
            scheduled_for: new Date("2026-07-28T00:00:00.000Z"),
            cancelled_at: null,
            completed_at: now,
          }),
        },
      }),
    );
    mocks.exportFindMany.mockResolvedValue([
      { storage_key: "laitstyles/account-exports/customer/export-1" },
      { storage_key: null },
    ]);

    const result = await executeScheduledDeletion("req-1", now);

    expect(mocks.deleteArtifact).toHaveBeenCalledWith(
      "laitstyles/account-exports/customer/export-1",
    );
    expect(mocks.anonymize).toHaveBeenCalledWith(expect.anything(), identity.customerId);
    expect(result.status).toBe("completed");
  });

  it("re-blocks a scheduled deletion if new activity appeared since scheduling", async () => {
    clearBlockers();
    mocks.ordersFindFirst.mockResolvedValue({ id: "order-1" });
    mocks.deletionFindUnique.mockResolvedValue({
      id: "req-1",
      customer_id: identity.customerId,
      status: "scheduled",
      scheduled_for: new Date("2026-07-28T00:00:00.000Z"),
    });

    await expect(executeScheduledDeletion("req-1", now)).rejects.toMatchObject({
      code: "ACCOUNT_DELETION_BLOCKED",
    });
    expect(mocks.deletionUpdate).toHaveBeenCalledWith({
      where: { id: "req-1" },
      data: { status: "blocked" },
    });
    expect(mocks.anonymize).not.toHaveBeenCalled();
  });

  it("refuses to execute a request that is not yet due", async () => {
    mocks.deletionFindUnique.mockResolvedValue({
      id: "req-1",
      customer_id: identity.customerId,
      status: "scheduled",
      scheduled_for: new Date("2026-08-12T00:00:00.000Z"),
    });

    await expect(executeScheduledDeletion("req-1", now)).rejects.toMatchObject({
      code: "ACCOUNT_DELETION_NOT_DUE",
    });
  });
});
