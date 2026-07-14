import { describe, expect, it } from "vitest";
import {
  defaultOrderQuery,
  getOrderSavedViewCounts,
  getOrderWorkspaceSummary,
  queryOrders,
} from "@/features/control-room/orders/order-selectors";
import { activeControlRoomSeed } from "@/lib/control-room/seed";

describe("Orders workspace selectors", () => {
  it("sorts all orders newest first by default", () => {
    const orders = queryOrders(activeControlRoomSeed, defaultOrderQuery);

    expect(orders).toHaveLength(activeControlRoomSeed.orders.length);
    expect(orders[0]?.id).toBe("LS-20481");
    expect(orders.at(-1)?.id).toBe("LS-20412");
  });

  it("filters payment exceptions and fulfilment work", () => {
    const payment = queryOrders(activeControlRoomSeed, {
      ...defaultOrderQuery,
      view: "pending-payment",
    });
    const fulfilment = queryOrders(activeControlRoomSeed, {
      ...defaultOrderQuery,
      view: "fulfilment",
    });

    expect(payment.map((order) => order.id)).toEqual(["LS-20479"]);
    expect(fulfilment.map((order) => order.id)).toEqual([
      "LS-20481",
      "LS-20480",
      "LS-20441",
      "LS-20412",
    ]);
  });

  it("searches across customer, product and city context", () => {
    expect(
      queryOrders(activeControlRoomSeed, {
        ...defaultOrderQuery,
        search: "sage tomi",
      }).map((order) => order.id),
    ).toEqual(["LS-20480"]);

    expect(
      queryOrders(activeControlRoomSeed, {
        ...defaultOrderQuery,
        search: "enugu canvas",
      }).map((order) => order.id),
    ).toEqual(["LS-20479"]);
  });

  it("reports connected view counts and summary metrics", () => {
    const counts = getOrderSavedViewCounts(activeControlRoomSeed.orders);
    const summary = getOrderWorkspaceSummary(activeControlRoomSeed);

    expect(counts).toMatchObject({
      all: 6,
      "needs-attention": 3,
      "pending-payment": 1,
      fulfilment: 4,
      delivered: 1,
      closed: 0,
    });
    expect(summary).toMatchObject({
      totalOrders: 6,
      needsAttention: 3,
      pendingPayment: 1,
      inFulfilment: 4,
      delivered: 1,
    });
    expect(summary.netRevenue).toBe(171500);
  });
});
