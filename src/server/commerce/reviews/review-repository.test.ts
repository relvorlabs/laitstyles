import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => {
  class PrismaClientKnownRequestError extends Error {
    code: string;

    constructor(code: string) {
      super(code);
      this.code = code;
    }
  }

  return {
    Prisma: { PrismaClientKnownRequestError },
    prisma: {
      order_lines: { findFirst: mocks.findFirst },
      product_reviews: { create: mocks.create, update: mocks.update },
      $transaction: mocks.transaction,
    },
  };
});

import { Prisma } from "@/lib/prisma";

import { getOwnedReviewContext, submitReview, withdrawReview } from "./review-repository";

const now = new Date("2026-07-20T12:00:00Z");
const input = {
  rating: 5,
  title: "Exactly as pictured",
  body: "The piece arrived beautifully packed and fits exactly as expected.",
  fit: "true_to_size" as const,
};

function line(overrides: Record<string, unknown> = {}) {
  return {
    id: "line-a",
    product_id: "product-a",
    product_name: "Archive silk dress",
    variant_label: "UK 12 / Emerald",
    quantity: 1,
    fulfilment_status: "delivered",
    delivered_quantity: 1,
    delivered_at: new Date("2026-07-01T12:00:00Z"),
    refund_status: "not_refunded",
    products: { slug: "archive-silk-dress" },
    product_review: null,
    return_lines: [],
    ...overrides,
  };
}

describe("owned review repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (work: (tx: unknown) => Promise<unknown>) =>
      work({
        order_lines: { findFirst: mocks.findFirst },
        product_reviews: { create: mocks.create, update: mocks.update },
      }),
    );
    mocks.create.mockResolvedValue({ id: "review-a" });
    mocks.update.mockResolvedValue({ id: "review-a" });
  });

  it("scopes the order-line ownership inside the Prisma query", async () => {
    mocks.findFirst.mockResolvedValueOnce(line());

    const result = await getOwnedReviewContext({
      customerId: "customer-a",
      orderNumber: "LS-1001",
      orderLineId: "line-a",
      now,
    });

    expect(mocks.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "line-a",
          orders: { order_number: "LS-1001", customer_id: "customer-a" },
        },
        select: expect.objectContaining({
          return_lines: {
            where: { return: { status: "completed" } },
            select: { quantity: true },
          },
        }),
      }),
    );
    expect(result).toMatchObject({
      found: true,
      line: {
        id: "line-a",
        productId: "product-a",
        productSlug: "archive-silk-dress",
        productName: "Archive silk dress",
        sizeOrdered: "UK 12 / Emerald",
      },
      review: null,
      eligibility: { eligible: true },
    });
  });

  it("does not distinguish a missing line from a line owned by another customer", async () => {
    mocks.findFirst.mockResolvedValue(null);

    await expect(
      getOwnedReviewContext({
        customerId: "customer-a",
        orderNumber: "LS-1001",
        orderLineId: "foreign-line",
        now,
      }),
    ).resolves.toEqual({ found: false, reason: "order_line_not_found" });
  });

  it.each([
    [
      "delivery",
      line({ fulfilment_status: "dispatched", delivered_quantity: 0, delivered_at: null }),
      "awaiting_delivery",
    ],
    [
      "completed returns",
      line({
        fulfilment_status: "returned",
        return_lines: [{ quantity: 1 }],
      }),
      "fully_returned",
    ],
    ["refund", line({ refund_status: "refunded" }), "fully_refunded"],
  ])("rechecks stale %s truth inside the transaction", async (_label, freshLine, reason) => {
    mocks.findFirst.mockResolvedValueOnce(freshLine);

    await expect(
      submitReview({
        customerId: "customer-a",
        orderNumber: "LS-1001",
        orderLineId: "line-a",
        input,
        now,
      }),
    ).resolves.toEqual({ ok: false, reason });
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("creates a pending review using only server-derived purchase context", async () => {
    mocks.findFirst.mockResolvedValueOnce(line());
    mocks.create.mockResolvedValueOnce({ id: "review-new" });

    const result = await submitReview({
      customerId: "customer-a",
      orderNumber: "LS-1001",
      orderLineId: "line-a",
      input,
      now,
    });

    expect(mocks.create).toHaveBeenCalledWith({
      data: {
        order_line_id: "line-a",
        rating: 5,
        title: "Exactly as pictured",
        body: input.body,
        fit: "true_to_size",
        size_ordered: "UK 12 / Emerald",
        status: "pending",
        submitted_at: now,
      },
      select: { id: true },
    });
    expect(result).toEqual({ ok: true, reviewId: "review-new", productSlug: "archive-silk-dress" });
  });

  it("maps the order-line unique race to already_reviewed", async () => {
    mocks.findFirst.mockResolvedValueOnce(line());
    mocks.create.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("P2002"));

    await expect(
      submitReview({
        customerId: "customer-a",
        orderNumber: "LS-1001",
        orderLineId: "line-a",
        input,
        now,
      }),
    ).resolves.toEqual({ ok: false, reason: "already_reviewed" });
  });

  it.each([
    "published",
    "rejected",
    "withdrawn",
  ] as const)("resubmits a %s review to moderation", async (status) => {
    mocks.findFirst.mockResolvedValueOnce(
      line({
        product_review: {
          id: "review-a",
          rating: 3,
          title: null,
          body: "An older review body that is long enough.",
          fit: "runs_small",
          size_ordered: "UK 12 / Emerald",
          status,
          submitted_at: new Date("2026-07-05T12:00:00Z"),
          rejection_reason: status === "rejected" ? "Needs more detail" : null,
        },
      }),
    );

    await expect(
      submitReview({
        customerId: "customer-a",
        orderNumber: "LS-1001",
        orderLineId: "line-a",
        input,
        now,
      }),
    ).resolves.toEqual({ ok: true, reviewId: "review-a", productSlug: "archive-silk-dress" });

    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "review-a" },
      data: expect.objectContaining({
        rating: 5,
        status: "pending",
        submitted_at: now,
        published_at: null,
        reviewed_at: null,
        reviewed_by_profile_id: null,
        rejection_reason: null,
      }),
      select: { id: true },
    });
  });

  it("withdraws an owned review after repeating the ownership query in a transaction", async () => {
    mocks.findFirst.mockResolvedValueOnce(
      line({
        product_review: {
          id: "review-a",
          rating: 5,
          title: null,
          body: input.body,
          fit: "true_to_size",
          size_ordered: "UK 12 / Emerald",
          status: "published",
          submitted_at: now,
          rejection_reason: null,
        },
      }),
    );

    await expect(
      withdrawReview({
        customerId: "customer-a",
        orderNumber: "LS-1001",
        orderLineId: "line-a",
      }),
    ).resolves.toEqual({ ok: true, reviewId: "review-a", productSlug: "archive-silk-dress" });

    expect(mocks.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "line-a",
          orders: { order_number: "LS-1001", customer_id: "customer-a" },
        },
      }),
    );
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "review-a" },
      data: { status: "withdrawn" },
      select: { id: true },
    });
  });
});
