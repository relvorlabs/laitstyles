import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAccountOrders: vi.fn(),
  getAccountOrder: vi.fn(),
  requestOrderCancellation: vi.fn(),
}));

vi.mock("@/modules/orders/server/account-orders", () => ({
  getAccountOrders: mocks.getAccountOrders,
  getAccountOrder: mocks.getAccountOrder,
  requestOrderCancellation: mocks.requestOrderCancellation,
}));

import {
  getCommerceAccountOrder,
  getCommerceAccountOrders,
  isPaymentMethodSetupOrder,
  requestCommerceOrderCancellation,
} from "@/modules/orders/server/account-commerce-orders";

const identity = {
  kind: "consumer" as const,
  authUserId: "11111111-1111-4111-8111-111111111111",
  customerId: "22222222-2222-4222-8222-222222222222",
  email: "buyer@example.com",
  displayName: "Buyer",
  phone: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("account commerce order boundary", () => {
  it("removes payment-method setup charges from merchandise order history", async () => {
    mocks.getAccountOrders.mockResolvedValueOnce([
      { orderNumber: "LS-METHOD-ABC123" },
      { orderNumber: "LS-ORDER-123" },
    ]);

    await expect(getCommerceAccountOrders(identity.customerId)).resolves.toEqual([
      { orderNumber: "LS-ORDER-123" },
    ]);
  });

  it("does not query setup-charge details through the commerce boundary", async () => {
    await expect(
      getCommerceAccountOrder(identity.customerId, "ls-method-abc123"),
    ).resolves.toBeNull();
    expect(mocks.getAccountOrder).not.toHaveBeenCalled();
  });

  it("rejects cancellation of an internal setup-charge order", async () => {
    await expect(
      requestCommerceOrderCancellation(identity, "LS-METHOD-ABC123"),
    ).rejects.toMatchObject({ code: "ORDER_NOT_FOUND", status: 404 });
    expect(mocks.requestOrderCancellation).not.toHaveBeenCalled();
  });

  it("recognizes setup order references case-insensitively", () => {
    expect(isPaymentMethodSetupOrder("ls-method-reference")).toBe(true);
    expect(isPaymentMethodSetupOrder("LS-ORDER-REFERENCE")).toBe(false);
  });
});
