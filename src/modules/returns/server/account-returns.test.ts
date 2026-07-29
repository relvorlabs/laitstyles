import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  createReturn: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { returns: { findMany: mocks.findMany, findFirst: mocks.findFirst } },
}));
vi.mock("@/modules/returns/server/commands", () => ({ createReturn: mocks.createReturn }));

import { err } from "@/lib/errors";
import {
  createCustomerReturn,
  getAccountReturn,
  listAccountReturns,
} from "@/modules/returns/server/account-returns";

const identity = {
  kind: "consumer" as const,
  authUserId: "11111111-1111-4111-8111-111111111111",
  email: "ada@example.com",
  displayName: "Ada",
  phone: null,
  customerId: "22222222-2222-4222-8222-222222222222",
};

beforeEach(() => vi.clearAllMocks());

describe("account return ownership", () => {
  it("scopes list and detail reads through the owned order", async () => {
    mocks.findMany.mockResolvedValue([]);
    mocks.findFirst.mockResolvedValue(null);

    await listAccountReturns(identity.customerId);
    await getAccountReturn(identity.customerId, "33333333-3333-4333-8333-333333333333");

    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { order: { customer_id: identity.customerId } } }),
    );
    expect(mocks.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "33333333-3333-4333-8333-333333333333",
          order: { customer_id: identity.customerId },
        },
      }),
    );
  });

  it("rejects a return for an undelivered line with a stable account error", async () => {
    mocks.createReturn.mockResolvedValue(
      err({
        code: "invalid-return-transition",
        message: "Only a delivered order can enter the customer return workflow.",
      }),
    );

    await expect(
      createCustomerReturn(identity, {
        orderNumber: "LS-1",
        reason: "Wrong fit",
        note: "",
        lines: [{ orderLineId: "44444444-4444-4444-8444-444444444444", quantity: 1 }],
      }),
    ).rejects.toMatchObject({ code: "RETURN_NOT_ELIGIBLE" });
  });
});
