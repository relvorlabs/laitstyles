import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findOrder: vi.fn(),
  countDisputes: vi.fn(),
  updateOrder: vi.fn(),
  updateDispute: vi.fn(),
}));

vi.mock("@/lib/prisma", async () => {
  const actual = await vi.importActual<typeof import("@/lib/prisma")>("@/lib/prisma");
  return {
    ...actual,
    prisma: {
      orders: {
        findUnique: mocks.findOrder,
        update: mocks.updateOrder,
      },
      payment_disputes: {
        count: mocks.countDisputes,
        updateMany: mocks.updateDispute,
      },
    },
  };
});

import { Prisma } from "@/lib/prisma";
import { reconcileOrderDisputeState } from "@/modules/payments/server/dispute-order-state";

const dispute = {
  id: "11111111-1111-4111-8111-111111111111",
  paymentId: "22222222-2222-4222-8222-222222222222",
  orderId: "33333333-3333-4333-8333-333333333333",
  orderNumber: "LS-1001",
  customerId: "44444444-4444-4444-8444-444444444444",
  customerName: "Buyer",
  providerDisputeId: "42",
  providerStatus: "resolved",
  status: "resolved" as const,
  category: null,
  amountMinor: 25_000,
  currency: "NGN",
  reason: null,
  evidence: [],
  evidenceDueAt: null,
  resolvedAt: "2026-07-30T12:00:00.000Z",
  resolutionNote: "declined",
  lastProviderSyncAt: "2026-07-30T12:00:00.000Z",
  createdAt: "2026-07-30T10:00:00.000Z",
  updatedAt: "2026-07-30T12:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findOrder.mockResolvedValue({
    id: dispute.orderId,
    total: new Prisma.Decimal("1000.00"),
    refunded_amount: new Prisma.Decimal("250.00"),
    payments: [{ status: "success" }],
  });
  mocks.countDisputes.mockResolvedValue(0);
  mocks.updateOrder.mockResolvedValue({});
  mocks.updateDispute.mockResolvedValue({ count: 0 });
});

describe("reconcileOrderDisputeState", () => {
  it("preserves partially refunded order state after a dispute becomes terminal", async () => {
    await reconcileOrderDisputeState(dispute);

    expect(mocks.updateOrder).toHaveBeenCalledWith({
      where: { id: dispute.orderId },
      data: { payment_status: "partially_refunded", attention: null },
    });
  });

  it("keeps the order under review while another dispute remains unresolved", async () => {
    mocks.countDisputes.mockResolvedValueOnce(1);

    await reconcileOrderDisputeState(dispute);

    expect(mocks.updateOrder).toHaveBeenCalledWith({
      where: { id: dispute.orderId },
      data: {
        payment_status: "review_required",
        attention: "A Paystack dispute requires review.",
      },
    });
  });

  it("normalizes archived provider disputes as local terminal records", async () => {
    const archived = {
      ...dispute,
      providerStatus: "archived",
      status: "pending" as const,
      resolvedAt: null,
    };

    const result = await reconcileOrderDisputeState(archived);

    expect(mocks.updateDispute).toHaveBeenCalledWith({
      where: {
        id: dispute.id,
        provider_status: "archived",
        status: { not: "resolved" },
      },
      data: {
        status: "resolved",
        resolved_at: expect.any(Date),
      },
    });
    expect(result.status).toBe("resolved");
    expect(result.resolvedAt).not.toBeNull();
  });
});
