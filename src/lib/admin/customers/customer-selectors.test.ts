import { describe, expect, it } from "vitest";
import {
  type CustomerMetricProjection,
  type CustomerProfileRow,
  mapCustomerProfile,
} from "@/modules/customers/server/mappers";

const now = new Date("2026-07-09T12:00:00+01:00");

function product(id: string, name: string) {
  return {
    id,
    name,
    inventory_mode: "stocked",
    catalogue_categories: { name: "Accessories" },
    product_media: [],
  };
}

function customerRow(): CustomerProfileRow {
  const tote = product("canvas-carry-tote", "Canvas carry tote");
  const vest = product("sage-field-vest", "Sage field vest");
  return {
    id: "customer-amara",
    name: "Amara Okafor",
    email: "amara@example.com",
    phone: "+2348000000000",
    city: "Lagos",
    type: "individual",
    created_at: new Date("2026-01-01T00:00:00.000Z"),
    customer_addresses: [],
    customer_notes: [],
    customer_saved_products: [{ product_id: vest.id, created_at: now, products: vest }],
    orders: [
      {
        id: "order-1",
        order_number: "LS-20481",
        source: "offline-sale",
        channel: "physical_store",
        payment_status: "paid",
        fulfilment_status: "delivered",
        fulfilment_method: "delivery",
        placed_at: new Date("2026-07-08T12:00:00+01:00"),
        delivery_city: "Lagos",
        delivery_address: null,
        order_lines: [
          {
            id: "line-1",
            product_id: tote.id,
            quantity: 2,
            products: tote,
            product_review: {
              id: "review-1",
              rating: 5,
              title: "Exactly as pictured",
              created_at: now,
            },
          },
        ],
        order_payment_events: [],
        order_timeline_events: [],
        returns: [
          {
            id: "return-1",
            status: "requested",
            reason: "Fit did not work",
            note: "Awaiting approval",
            requested_at: now,
            updated_at: now,
          },
        ],
      },
    ],
    holds: [
      {
        id: "hold-1",
        product_id: tote.id,
        quantity: 2,
        source: "whatsapp",
        started_at: now,
        released_at: null,
        converted_at: null,
        note: null,
        products: tote,
        orders: null,
      },
    ],
    activity_events: [],
  } as unknown as CustomerProfileRow;
}

function metrics(overrides: Partial<CustomerMetricProjection> = {}): CustomerMetricProjection {
  return {
    lifetimeSpend: 72_000,
    orderCount: 2,
    paidOrderCount: 2,
    returnCount: 1,
    cancellationCount: 0,
    activeHoldCount: 1,
    reviewCount: 1,
    lastPurchaseAt: now,
    paymentAttention: false,
    deliveryAttention: false,
    returnAttention: true,
    holdAttention: true,
    ...overrides,
  };
}

describe("customer relationship mapper", () => {
  it("derives metrics, segments and attention from persisted projections", () => {
    const profile = mapCustomerProfile(customerRow(), metrics());

    expect(profile.metrics).toMatchObject({
      lifetimeSpend: 72_000,
      averageOrderValue: 36_000,
      orderCount: 2,
      activeHoldCount: 1,
      reviewCount: 1,
    });
    expect(profile.segments).toEqual(
      expect.arrayContaining(["needs-attention", "high-value", "returning"]),
    );
    expect(profile.attention).toEqual(expect.arrayContaining(["return", "hold"]));
  });

  it("connects purchased, held, saved and reviewed product context", () => {
    const profile = mapCustomerProfile(customerRow(), metrics());
    const byProduct = new Map(
      profile.products.map((relationship) => [relationship.productId, relationship]),
    );

    expect(byProduct.get("canvas-carry-tote")).toMatchObject({
      purchasedQuantity: 2,
      heldQuantity: 2,
      reviewed: true,
    });
    expect(byProduct.get("sage-field-vest")?.saved).toBe(true);
    expect(profile.timeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: "Offline sale LS-20481" }),
        expect.objectContaining({ returnId: "return-1" }),
      ]),
    );
  });
});
