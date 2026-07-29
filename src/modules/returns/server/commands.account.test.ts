import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ transaction: vi.fn(), findFirst: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: mocks.transaction },
  Prisma: { PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {} },
}));
vi.mock("@/modules/inventory/server/operational-stock", () => ({
  applyOperationalStockMutation: vi.fn(),
  OperationalStockError: class OperationalStockError extends Error {},
}));

import { createReturn } from "@/modules/returns/server/commands";

const identity = {
  kind: "consumer" as const,
  authUserId: "11111111-1111-4111-8111-111111111111",
  email: "ada@example.com",
  displayName: "Ada",
  phone: null,
  customerId: "22222222-2222-4222-8222-222222222222",
};

beforeEach(() => vi.clearAllMocks());

describe("createReturn for a customer", () => {
  it("looks up only an order owned by the authenticated customer", async () => {
    const tx = { $executeRaw: vi.fn(), orders: { findFirst: mocks.findFirst } };
    mocks.findFirst.mockResolvedValue(null);
    mocks.transaction.mockImplementationOnce(async (work: (client: typeof tx) => unknown) =>
      work(tx),
    );

    await createReturn(identity, {
      orderId: "LS-1",
      reason: "Wrong fit",
      note: "",
      lines: [{ orderLineId: "44444444-4444-4444-8444-444444444444", quantity: 1 }],
    });

    expect(mocks.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ customer_id: identity.customerId }),
      }),
    );
  });

  it("rejects an undelivered owned order", async () => {
    const tx = { $executeRaw: vi.fn(), orders: { findFirst: mocks.findFirst } };
    mocks.findFirst.mockResolvedValue({
      id: "order-1",
      order_number: "LS-1",
      fulfilment_status: "unfulfilled",
      order_lines: [],
    });
    mocks.transaction.mockImplementationOnce(async (work: (client: typeof tx) => unknown) =>
      work(tx),
    );

    const result = await createReturn(identity, {
      orderId: "LS-1",
      reason: "Wrong fit",
      note: "",
      lines: [{ orderLineId: "44444444-4444-4444-8444-444444444444", quantity: 1 }],
    });

    expect(result).toMatchObject({
      ok: false,
      error: { code: "invalid-return-transition" },
    });
  });
});
