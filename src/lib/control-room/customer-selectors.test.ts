import { describe, expect, it } from "vitest";
import {
  getCustomerAttentionReasons,
  getCustomerMetrics,
  getCustomerProductRelationships,
  getCustomerRelationshipProfile,
  getCustomerTimeline,
} from "@/lib/control-room/customer-selectors";
import { applyOfflineSale } from "@/lib/control-room/offline-sale-actions";
import { activeControlRoomSeed } from "@/lib/control-room/seed";
import type { ControlRoomState } from "@/lib/control-room/types";

describe("customer relationship selectors", () => {
  it("derives spend, orders and active holds from connected records", () => {
    const metrics = getCustomerMetrics(
      activeControlRoomSeed,
      "customer-amara",
    );
    const profile = getCustomerRelationshipProfile(
      activeControlRoomSeed,
      "customer-amara",
    );

    expect(metrics).toMatchObject({
      lifetimeSpend: 72_000,
      averageOrderValue: 36_000,
      orderCount: 2,
      paidOrderCount: 2,
      activeHoldCount: 1,
      reviewCount: 1,
    });
    expect(profile?.segments).toEqual(
      expect.arrayContaining(["high-value", "returning"]),
    );
    expect(profile?.attention).toContain("hold");
  });

  it("derives payment and delivery attention without customer snapshot flags", () => {
    expect(
      getCustomerAttentionReasons(activeControlRoomSeed, "customer-nneka"),
    ).toEqual(expect.arrayContaining(["payment", "delivery"]));
  });

  it("adds an offline sale to spend and timeline through the connected order", () => {
    const result = applyOfflineSale(
      activeControlRoomSeed,
      {
        lines: [
          {
            productId: "canvas-carry-tote",
            quantity: 1,
            unitPrice: 15_000,
          },
        ],
        channel: "physical-store",
        customer: { kind: "existing", customerId: "customer-amara" },
        paymentMethod: "cash",
        paymentStatus: "paid",
        notes: "Phase 5 customer history test",
      },
      "2026-07-09T12:00:00+01:00",
      createTestId,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const metrics = getCustomerMetrics(
      result.value.state,
      "customer-amara",
    );
    const timeline = getCustomerTimeline(
      result.value.state,
      "customer-amara",
    );

    expect(metrics.lifetimeSpend).toBe(87_000);
    expect(metrics.orderCount).toBe(3);
    expect(timeline.some((event) => event.title.startsWith("Offline sale LS-"))).toBe(
      true,
    );
  });

  it("includes connected returns in metrics, attention and timeline", () => {
    const state: ControlRoomState = {
      ...activeControlRoomSeed,
      returns: [
        {
          id: "return-phase5",
          orderId: "LS-20481",
          customerId: "customer-amara",
          status: "requested",
          reason: "Fit did not work",
          requestedAt: "2026-07-09T12:05:00+01:00",
          updatedAt: "2026-07-09T12:05:00+01:00",
          lines: [
            {
              id: "return-line-phase5",
              orderLineId: "line-20481-1",
              productId: "botanical-jeans",
              quantity: 1,
              disposition: "pending",
            },
          ],
          refundAmount: 28_500,
          note: "Awaiting approval",
        },
      ],
    };

    expect(getCustomerMetrics(state, "customer-amara").returnCount).toBe(1);
    expect(getCustomerAttentionReasons(state, "customer-amara")).toContain(
      "return",
    );
    expect(
      getCustomerTimeline(state, "customer-amara").some(
        (event) => event.returnId === "return-phase5",
      ),
    ).toBe(true);
  });

  it("distinguishes purchased, held, saved and reviewed product context", () => {
    const customer = {
      ...activeControlRoomSeed.customers[0]!,
      savedProductIds: ["sage-field-vest"],
    };
    const state: ControlRoomState = {
      ...activeControlRoomSeed,
      customers: [customer, ...activeControlRoomSeed.customers.slice(1)],
    };
    const relationships = getCustomerProductRelationships(state, customer);
    const byProduct = new Map(
      relationships.map((relationship) => [
        relationship.productId,
        relationship,
      ]),
    );

    expect(byProduct.get("botanical-jeans")).toMatchObject({
      purchasedQuantity: 1,
      heldQuantity: 2,
    });
    expect(byProduct.get("canvas-carry-tote")).toMatchObject({
      purchasedQuantity: 2,
      reviewed: true,
    });
    expect(byProduct.get("sage-field-vest")?.saved).toBe(true);
  });
});

let id = 0;
function createTestId(prefix: string) {
  id += 1;
  return `${prefix}-${id}`;
}
