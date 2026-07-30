import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findRefund: vi.fn(),
  findKnown: vi.fn(),
  applyState: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    payment_refunds: {
      findUnique: mocks.findRefund,
      findFirst: mocks.findKnown,
    },
  },
}));
vi.mock("@/modules/payments/server/refunds", () => ({
  applyRefundProviderState: mocks.applyState,
}));

import { applyRefundWebhookState } from "@/modules/payments/server/refund-webhooks";

const refundId = "11111111-1111-4111-8111-111111111111";
const provider = {
  id: "3018284",
  transactionId: "9001",
  transactionReference: "pay_1",
  amountMinor: 10_000,
  deductedAmountMinor: 10_000,
  currency: "NGN" as const,
  status: "failed" as const,
  providerStatus: "failed",
  customerNote: null,
  merchantNote: `Laitstyles refund ${refundId}`,
  refundedAt: null,
  expectedAt: null,
  createdAt: null,
  updatedAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findRefund.mockResolvedValue({ status: "processed", provider_status: "processed" });
  mocks.applyState.mockResolvedValue({ ok: true, value: { id: refundId, status: "processed" } });
});

describe("applyRefundWebhookState", () => {
  it("does not downgrade a processed refund after an out-of-order failed event", async () => {
    await applyRefundWebhookState(provider);

    expect(mocks.applyState).toHaveBeenCalledWith({
      refundId,
      provider: {
        ...provider,
        status: "processed",
        providerStatus: "processed",
      },
    });
  });

  it("applies non-terminal provider transitions normally", async () => {
    mocks.findRefund.mockResolvedValueOnce({ status: "processing", provider_status: "processing" });

    await applyRefundWebhookState({
      ...provider,
      status: "failed",
      providerStatus: "failed",
    });

    expect(mocks.applyState).toHaveBeenCalledWith({ refundId, provider });
  });
});
