import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findMany: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: { product_reviews: { findMany: mocks.findMany } },
}));

import { getPublicProductReviews } from "@/modules/reviews/server/public-product-reviews";

function review(overrides: Record<string, unknown> = {}) {
  return {
    id: "review-1",
    rating: 5,
    title: "Beautiful construction",
    body: "The fabric and finish feel considered, and the sizing was accurate.",
    fit: "true_to_size",
    size_ordered: "UK 12",
    published_at: new Date("2026-07-18T12:00:00.000Z"),
    order_line: {
      fulfilment_status: "delivered",
      delivered_quantity: 1,
      refund_status: "not_refunded",
      orders: { customer: { name: "Ada Okafor" } },
      return_lines: [],
    },
    ...overrides,
  };
}

describe("getPublicProductReviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queries only published reviews for a visible product", async () => {
    mocks.findMany.mockResolvedValue([]);

    await expect(getPublicProductReviews("linen-jacket")).resolves.toEqual({
      reviews: [],
      summary: {
        average: 0,
        count: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      },
    });

    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: "published",
          order_line: {
            products: {
              slug: "linen-jacket",
              lifecycle: "active",
              publication: "published",
            },
          },
        },
        orderBy: [{ published_at: "desc" }, { created_at: "desc" }],
      }),
    );
  });

  it("maps privacy-safe review content and computes a full rating distribution", async () => {
    mocks.findMany.mockResolvedValue([
      review(),
      review({
        id: "review-2",
        rating: 3,
        title: null,
        fit: "runs_small",
        size_ordered: null,
        published_at: null,
        order_line: {
          fulfilment_status: "partially_delivered",
          delivered_quantity: 1,
          refund_status: "partially_refunded",
          orders: { customer: { name: "Cherise" } },
          return_lines: [],
        },
      }),
    ]);

    const result = await getPublicProductReviews("linen-jacket");

    expect(result.summary).toEqual({
      average: 4,
      count: 2,
      distribution: { 1: 0, 2: 0, 3: 1, 4: 0, 5: 1 },
    });
    expect(result.reviews).toEqual([
      expect.objectContaining({
        id: "review-1",
        rating: 5,
        title: "Beautiful construction",
        author: "Ada O.",
        fit: "true_to_size",
        sizeOrdered: "UK 12",
        publishedAt: "2026-07-18T12:00:00.000Z",
      }),
      expect.objectContaining({
        id: "review-2",
        rating: 3,
        author: "Cherise",
        fit: "runs_small",
        publishedAt: null,
      }),
    ]);
    expect(JSON.stringify(result)).not.toMatch(/Okafor|customer_id|email|reason/i);
  });

  it("keeps published reviews after a later full return or refund with an honest marker", async () => {
    mocks.findMany.mockResolvedValue([
      review({
        id: "returned-review",
        order_line: {
          fulfilment_status: "returned",
          delivered_quantity: 1,
          refund_status: "not_refunded",
          orders: { customer: { name: "Ada Okafor" } },
          return_lines: [{ quantity: 1 }],
        },
      }),
      review({
        id: "refunded-review",
        order_line: {
          fulfilment_status: "delivered",
          delivered_quantity: 1,
          refund_status: "refunded",
          orders: { customer: { name: "Bola Yusuf" } },
          return_lines: [],
        },
      }),
    ]);

    const result = await getPublicProductReviews("linen-jacket");

    expect(result.reviews.map(({ id, lifecycleMarker }) => ({ id, lifecycleMarker }))).toEqual([
      { id: "returned-review", lifecycleMarker: "returned" },
      { id: "refunded-review", lifecycleMarker: "refunded" },
    ]);
  });

  it("does not infer a return marker from zero historical delivery and return quantities", async () => {
    mocks.findMany.mockResolvedValue([
      review({
        order_line: {
          fulfilment_status: "delivered",
          delivered_quantity: 0,
          refund_status: "not_refunded",
          orders: { customer: { name: "Ada Okafor" } },
          return_lines: [],
        },
      }),
    ]);

    const result = await getPublicProductReviews("linen-jacket");

    expect(result.reviews[0]).not.toHaveProperty("lifecycleMarker");
  });
});
