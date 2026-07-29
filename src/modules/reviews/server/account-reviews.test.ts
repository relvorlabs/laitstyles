import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  submitReview: vi.fn(),
  withdrawReview: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { order_lines: { findFirst: mocks.findFirst } },
}));
vi.mock("@/modules/reviews/server/repository", () => ({
  submitReview: mocks.submitReview,
  withdrawReview: mocks.withdrawReview,
}));

import {
  createCustomerReview,
  updateCustomerReview,
  withdrawCustomerReview,
} from "@/modules/reviews/server/account-reviews";

const identity = {
  kind: "consumer" as const,
  authUserId: "11111111-1111-4111-8111-111111111111",
  email: "ada@example.com",
  displayName: "Ada",
  phone: null,
  customerId: "22222222-2222-4222-8222-222222222222",
};
const input = {
  rating: 5,
  title: "Exactly as pictured",
  body: "The piece arrived beautifully packed and fits exactly as expected.",
  fit: "true_to_size" as const,
};

beforeEach(() => vi.clearAllMocks());

describe("account review operations", () => {
  it("maps the existing submission eligibility failure code for HTTP parity", async () => {
    mocks.submitReview.mockResolvedValue({ ok: false, reason: "awaiting_delivery" });

    await expect(
      createCustomerReview(identity, { orderNumber: "LS-1", orderLineId: "line-1", ...input }),
    ).rejects.toMatchObject({ code: "AWAITING_DELIVERY", status: 409 });
  });

  it("resolves a review id only through an order owned by the authenticated customer", async () => {
    mocks.findFirst.mockResolvedValue({ id: "line-1", orders: { order_number: "LS-1" } });
    mocks.submitReview.mockResolvedValue({ ok: true, reviewId: "review-1", productSlug: "dress" });

    await updateCustomerReview(identity, "review-1", input);

    expect(mocks.findFirst).toHaveBeenCalledWith({
      where: {
        product_review: { id: "review-1" },
        orders: { customer_id: identity.customerId },
      },
      select: { id: true, orders: { select: { order_number: true } } },
    });
    expect(mocks.submitReview).toHaveBeenCalledWith({
      customerId: identity.customerId,
      orderNumber: "LS-1",
      orderLineId: "line-1",
      input,
    });
  });

  it("conceals a review id not owned by the customer", async () => {
    mocks.findFirst.mockResolvedValue(null);

    await expect(withdrawCustomerReview(identity, "other-review")).rejects.toMatchObject({
      code: "REVIEW_NOT_FOUND",
      status: 404,
    });
    expect(mocks.withdrawReview).not.toHaveBeenCalled();
  });
});
