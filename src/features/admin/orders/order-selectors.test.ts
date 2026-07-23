import { describe, expect, it } from "vitest";
import {
  defaultOrderQuery,
  getOrderSavedViewCounts,
  getOrderWorkspaceSummary,
  queryOrders,
} from "@/features/admin/orders/order-selectors";
import { activeAdminSeed } from "@/lib/admin/shared/admin-seed";

describe("Orders workspace selectors", () => {
  it("sorts all orders newest first by default", () => {
    const orders = queryOrders(activeAdminSeed, defaultOrderQuery);

    expect(orders).toHaveLength(activeAdminSeed.orders.length);
    expect(orders[0]?.id).toBe("LS-20481");
    expect(orders.at(-1)?.id).toBe("LS-20412");
  });

  it("filters payment exceptions and fulfilment work", () => {
    const payment = queryOrders(activeAdminSeed, {
      ...defaultOrderQuery,
      view: "pending-payment",
    });
    const fulfilment = queryOrders(activeAdminSeed, {
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
      queryOrders(activeAdminSeed, {
        ...defaultOrderQuery,
        search: "sage tomi",
      }).map((order) => order.id),
    ).toEqual(["LS-20480"]);

    expect(
      queryOrders(activeAdminSeed, {
        ...defaultOrderQuery,
        search: "enugu canvas",
      }).map((order) => order.id),
    ).toEqual(["LS-20479"]);
  });

  it("reports connected view counts and summary metrics", () => {
    const counts = getOrderSavedViewCounts(activeAdminSeed.orders);
    const summary = getOrderWorkspaceSummary(activeAdminSeed);

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
