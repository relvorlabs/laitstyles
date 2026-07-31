import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findOrder: vi.fn(),
  findReturn: vi.fn(),
  findRefund: vi.fn(),
  findDispute: vi.fn(),
  findAuthorization: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    orders: { findFirst: mocks.findOrder },
    returns: { findFirst: mocks.findReturn },
    payment_refunds: { findFirst: mocks.findRefund },
    payment_disputes: { findFirst: mocks.findDispute },
    payment_authorizations: { findFirst: mocks.findAuthorization },
  },
}));

import { findActiveDeletionBlocker } from "@/modules/account-lifecycle/server/policy";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findOrder.mockResolvedValue(null);
  mocks.findReturn.mockResolvedValue(null);
  mocks.findRefund.mockResolvedValue(null);
  mocks.findDispute.mockResolvedValue(null);
  mocks.findAuthorization.mockResolvedValue(null);
});

describe("account deletion payment blockers", () => {
  it("does not treat the internal NGN 50 setup order as a commerce order", async () => {
    await expect(findActiveDeletionBlocker("customer-1")).resolves.toBeNull();

    expect(mocks.findOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          customer_id: "customer-1",
          source: { not: "payment-method-setup" },
        }),
      }),
    );
  });

  it("still blocks deletion while a setup authorization is pending", async () => {
    mocks.findAuthorization.mockResolvedValueOnce({ id: "authorization-1" });

    await expect(findActiveDeletionBlocker("customer-1")).resolves.toBe("pending-payout");
    expect(mocks.findAuthorization).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { customer_id: "customer-1", status: "pending" },
      }),
    );
  });
});
