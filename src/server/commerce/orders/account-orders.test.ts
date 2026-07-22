import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    orders: {
      findMany: prismaMocks.findMany,
      findFirst: prismaMocks.findFirst,
    },
  },
}));

import { getAccountOrder, getAccountOrders } from "./account-orders";

class DecimalStub {
  constructor(private readonly value: number) {}

  toNumber() {
    return this.value;
  }
}

const at = (iso: string) => new Date(iso);
const money = (value: number) => new DecimalStub(value);

function product(overrides: Record<string, unknown> = {}) {
  return {
    slug: "linen-jacket",
    lifecycle: "active",
    publication: "published",
    product_media: [
      {
        cloudinary_assets: {
          delivery_url: "https://res.cloudinary.com/store/linen.jpg",
          secure_url: "https://res.cloudinary.com/store/linen-original.jpg",
          alt: "Linen jacket",
          width: 900,
          height: 1200,
        },
      },
    ],
    ...overrides,
  };
}

function line(overrides: Record<string, unknown> = {}) {
  return {
    id: "line-a",
    product_name: "Purchase-time linen jacket",
    variant_label: "UK 12",
    sku: "LJ-12",
    quantity: 1,
    unit_price: money(28_500),
    fulfilment_status: "delivered",
    delivered_quantity: 1,
    delivered_at: at("2026-07-01T12:00:00.000Z"),
    cancelled_quantity: 0,
    refund_status: "not_refunded",
    refunded_amount: money(0),
    refunded_at: null,
    products: product(),
    product_review: null,
    return_lines: [],
    ...overrides,
  };
}

function order(overrides: Record<string, unknown> = {}) {
  return {
    order_number: "LS-1001",
    payment_status: "paid",
    payment_method: "card",
    fulfilment_method: "delivery",
    fulfilment_status: "delivered",
    currency: "NGN",
    subtotal: money(57_000),
    delivery_fee: money(2_500),
    discount_amount: money(1_000),
    total: money(58_500),
    refunded_amount: money(0),
    placed_at: at("2026-06-28T08:30:00.000Z"),
    updated_at: at("2026-07-03T09:15:00.000Z"),
    delivery_name: "Ada Okafor",
    delivery_phone: "+2348000000000",
    delivery_city: "Lagos",
    delivery_address: {
      line1: "18 Example Road",
      line2: "Lekki Phase 1",
      state: "Lagos",
      country: "Nigeria",
      postalCode: "105102",
      delivery_notes: "Private gate code",
    },
    order_timeline_events: [{ status: "placed", occurred_at: at("2026-06-28T08:30:00.000Z") }],
    order_lines: [line()],
    ...overrides,
  };
}

describe("account order reads", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(at("2026-07-20T12:00:00.000Z"));
    prismaMocks.findMany.mockReset();
    prismaMocks.findFirst.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("scopes the order list to its customer and returns an empty list", async () => {
    prismaMocks.findMany.mockResolvedValue([]);

    await expect(getAccountOrders("customer-a")).resolves.toEqual([]);
    expect(prismaMocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { customer_id: "customer-a" },
        orderBy: { placed_at: "desc" },
      }),
    );
  });

  it("counts only unreviewed eligible lines in a mixed order", async () => {
    prismaMocks.findMany.mockResolvedValue([
      order({
        order_lines: [
          line({ id: "delivered" }),
          line({
            id: "dispatched",
            fulfilment_status: "dispatched",
            delivered_quantity: 0,
            delivered_at: null,
          }),
          line({
            id: "partial-return",
            quantity: 2,
            delivered_quantity: 2,
            return_lines: [{ quantity: 1 }],
          }),
          line({
            id: "already-reviewed",
            product_review: {
              id: "review-published",
              status: "published",
              rejection_reason: null,
            },
          }),
        ],
      }),
    ]);

    const [result] = await getAccountOrders("customer-a");

    expect(result.reviewableItemCount).toBe(2);
    expect(result.itemCount).toBe(5);
  });

  it("queries an order by customer and public number in the same predicate", async () => {
    prismaMocks.findFirst.mockResolvedValue(null);

    await expect(getAccountOrder("customer-a", "LS-FOREIGN")).resolves.toBeNull();
    expect(prismaMocks.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          customer_id: "customer-a",
          order_number: "LS-FOREIGN",
        },
      }),
    );
  });

  it("serializes Decimal and Date values and aggregates completed return quantities", async () => {
    prismaMocks.findFirst.mockResolvedValue(
      order({
        order_lines: [
          line({
            quantity: 3,
            delivered_quantity: 3,
            unit_price: money(12_345.67),
            refunded_amount: money(1_234.56),
            refunded_at: at("2026-07-10T09:00:00.000Z"),
            return_lines: [{ quantity: 1 }, { quantity: 1 }],
          }),
        ],
      }),
    );

    const result = await getAccountOrder("customer-a", "LS-1001");

    expect(result).toMatchObject({
      orderNumber: "LS-1001",
      placedAt: "2026-06-28T08:30:00.000Z",
      updatedAt: "2026-07-03T09:15:00.000Z",
      subtotalKobo: 5_700_000,
      deliveryFeeKobo: 250_000,
      discountAmountKobo: 100_000,
      totalKobo: 5_850_000,
      lines: [
        {
          unitPriceKobo: 1_234_567,
          lineTotalKobo: 3_703_701,
          refundedAmountKobo: 123_456,
          refundedAt: "2026-07-10T09:00:00.000Z",
          completedReturnedQuantity: 2,
          reviewState: { kind: "eligible", expiresAt: "2026-09-29T12:00:00.000Z" },
        },
      ],
    });
    expect(prismaMocks.findFirst.mock.calls[0][0].select.order_lines.select.return_lines).toEqual({
      where: { return: { is: { status: "completed" } } },
      select: { quantity: true },
    });
    expect(JSON.stringify(result)).not.toContain("toNumber");
  });

  it("keeps purchase snapshots and imagery for an archived historical product", async () => {
    prismaMocks.findFirst.mockResolvedValue(
      order({
        order_lines: [
          line({
            product_name: "Name at checkout",
            variant_label: "Medium at checkout",
            products: product({
              slug: "renamed-live-slug",
              lifecycle: "archived",
              publication: "unpublished",
            }),
          }),
        ],
      }),
    );

    const result = await getAccountOrder("customer-a", "LS-1001");

    expect(result?.lines[0]).toMatchObject({
      productName: "Name at checkout",
      productSlug: null,
      variantLabel: "Medium at checkout",
      image: { src: "https://res.cloudinary.com/store/linen.jpg", alt: "Linen jacket" },
    });
  });

  it("maps every review lifecycle and preserves a published review after a later return", async () => {
    prismaMocks.findFirst.mockResolvedValue(
      order({
        order_lines: [
          line({
            id: "pending",
            product_review: { id: "r-pending", status: "pending", rejection_reason: null },
          }),
          line({
            id: "published-returned",
            fulfilment_status: "returned",
            return_lines: [{ quantity: 1 }],
            product_review: { id: "r-published", status: "published", rejection_reason: null },
          }),
          line({
            id: "rejected-refunded",
            refund_status: "refunded",
            product_review: {
              id: "r-rejected",
              status: "rejected",
              rejection_reason: "Please remove personal information.",
            },
          }),
          line({
            id: "withdrawn",
            product_review: { id: "r-withdrawn", status: "withdrawn", rejection_reason: null },
          }),
        ],
      }),
    );

    const result = await getAccountOrder("customer-a", "LS-1001");

    expect(result?.lines.map(({ reviewState }) => reviewState)).toEqual([
      { kind: "pending", reviewId: "r-pending" },
      { kind: "published", reviewId: "r-published", lifecycleMarker: "returned" },
      {
        kind: "rejected",
        reviewId: "r-rejected",
        reason: "Please remove personal information.",
        resubmission: { eligible: false, reason: "fully_refunded" },
      },
      {
        kind: "withdrawn",
        reviewId: "r-withdrawn",
        resubmission: { eligible: true, expiresAt: "2026-09-29T12:00:00.000Z" },
      },
    ]);
  });

  it("does not mark a migrated published review as returned when both delivery and returns are zero", async () => {
    prismaMocks.findFirst.mockResolvedValue(
      order({
        order_lines: [
          line({
            fulfilment_status: "unfulfilled",
            delivered_quantity: 0,
            delivered_at: null,
            return_lines: [],
            product_review: {
              id: "historical-review",
              status: "published",
              rejection_reason: null,
            },
          }),
        ],
      }),
    );

    const result = await getAccountOrder("customer-a", "LS-1001");

    expect(result?.lines[0].reviewState).toEqual({
      kind: "published",
      reviewId: "historical-review",
    });
  });

  it("returns an allow-listed DTO with no costs, notes, profile IDs, or internal ownership IDs", async () => {
    prismaMocks.findFirst.mockResolvedValue(order());

    const result = await getAccountOrder("customer-secret", "LS-1001");
    const serialized = JSON.stringify(result);
    const query = prismaMocks.findFirst.mock.calls[0][0];
    const selected = JSON.stringify(query.select);

    expect(serialized).not.toMatch(/customer-secret|customer_id|order_id|cost|notes|profile_id/);
    expect(selected).not.toMatch(/customer_id|cost|notes|attention|profile_id|metadata/);
    expect(result?.delivery).toEqual({
      name: "Ada Okafor",
      phone: "+2348000000000",
      line1: "18 Example Road",
      line2: "Lekki Phase 1",
      city: "Lagos",
      state: "Lagos",
      country: "Nigeria",
      postalCode: "105102",
    });
  });
});
