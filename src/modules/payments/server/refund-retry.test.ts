import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findRefund: vi.fn(),
  claimRefund: vi.fn(),
  updateRefund: vi.fn(),
  createAudit: vi.fn(),
  createRefund: vi.fn(),
  fetchRefund: vi.fn(),
  applyState: vi.fn(),
}));

vi.mock("@/lib/prisma", async () => {
  const actual = await vi.importActual<typeof import("@/lib/prisma")>("@/lib/prisma");
  return {
    ...actual,
    prisma: {
      payment_refunds: {
        findUnique: mocks.findRefund,
        updateMany: mocks.updateRefund,
      },
      $transaction: vi.fn(async (operation: (tx: unknown) => unknown) =>
        operation({
          payment_refunds: { updateMany: mocks.claimRefund },
          audit_events: { create: mocks.createAudit },
        }),
      ),
    },
  };
});
vi.mock("@/modules/payments/server/paystack", () => ({
  createRefund: mocks.createRefund,
  fetchRefund: mocks.fetchRefund,
}));
vi.mock("@/modules/payments/server/refunds", () => ({
  applyRefundProviderState: mocks.applyState,
}));

import { Prisma } from "@/lib/prisma";
import { retryRefundCommand } from "@/modules/payments/server/refund-retry";

const actor = {
  kind: "staff" as const,
  authUserId: "11111111-1111-4111-8111-111111111111",
  email: "owner@example.com",
  displayName: "Owner",
  role: "admin" as const,
};
const refund = {
  id: "22222222-2222-4222-8222-222222222222",
  payment_id: "33333333-3333-4333-8333-333333333333",
  provider_reference: null,
  status: "needs_attention",
  requested_amount: new Prisma.Decimal("100.00"),
  currency: "NGN",
  reason: "Customer return",
  retry_count: 0,
  payments: { reference: "pay_1" },
};
const provider = {
  id: "3018284",
  transactionId: "9001",
  transactionReference: "pay_1",
  amountMinor: 10_000,
  deductedAmountMinor: 0,
  currency: "NGN",
  status: "pending",
  providerStatus: "pending",
  customerNote: "Customer return",
  merchantNote: `Laitstyles refund ${refund.id}`,
  refundedAt: null,
  expectedAt: null,
  createdAt: null,
  updatedAt: null,
};
const projection = { id: refund.id, status: "pending" };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findRefund.mockResolvedValue(refund);
  mocks.claimRefund.mockResolvedValue({ count: 1 });
  mocks.updateRefund.mockResolvedValue({ count: 1 });
  mocks.createAudit.mockResolvedValue({});
  mocks.createRefund.mockResolvedValue(provider);
  mocks.applyState.mockResolvedValue({ ok: true, value: projection });
});

describe("retryRefundCommand", () => {
  it("claims provider execution once before creating a second Paystack request", async () => {
    await expect(
      retryRefundCommand(actor, refund.id, "retry-key-123"),
    ).resolves.toEqual({ ok: true, value: projection });

    expect(mocks.claimRefund).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: refund.id,
          provider_reference: null,
          status: { in: ["failed", "needs_attention"] },
        },
      }),
    );
    expect(mocks.createRefund).toHaveBeenCalledTimes(1);
    expect(mocks.createAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "payments:refund:retry-claimed",
          metadata: expect.objectContaining({ idempotency_key: "retry-key-123" }),
        }),
      }),
    );
  });

  it("does not call Paystack when another retry already holds the claim", async () => {
    mocks.claimRefund.mockResolvedValueOnce({ count: 0 });

    await expect(
      retryRefundCommand(actor, refund.id, "retry-key-456"),
    ).resolves.toEqual({
      ok: false,
      error: expect.objectContaining({ code: "REFUND_RECONCILIATION_REQUIRED" }),
    });
    expect(mocks.createRefund).not.toHaveBeenCalled();
  });

  it("resolves known provider truth instead of creating another refund", async () => {
    mocks.findRefund.mockResolvedValueOnce({ ...refund, provider_reference: "3018284" });
    mocks.fetchRefund.mockResolvedValueOnce(provider);

    await retryRefundCommand(actor, refund.id, "retry-key-789");

    expect(mocks.fetchRefund).toHaveBeenCalledWith("3018284");
    expect(mocks.createRefund).not.toHaveBeenCalled();
    expect(mocks.applyState).toHaveBeenCalledWith({
      refundId: refund.id,
      provider,
      actorProfileId: actor.authUserId,
    });
  });
});
