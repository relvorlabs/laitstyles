import { describe, expect, it } from "vitest";
import { defaultOrderQuery } from "@/features/admin/orders/order-selectors";
import { buildOrdersHref } from "@/features/admin/orders/orders-url";

describe("Orders URL state", () => {
  it("omits default values", () => {
    expect(
      buildOrdersHref("/admin/orders", {
        query: defaultOrderQuery,
        orderId: null,
      }),
    ).toBe("/admin/orders");
  });

  it("serializes views, filters and the open order", () => {
    expect(
      buildOrdersHref("/admin/orders", {
        query: {
          view: "needs-attention",
          search: "Amara jeans",
          channel: "online",
          payment: "paid",
          sort: "total-desc",
        },
        orderId: "LS-20481",
      }),
    ).toBe(
      "/admin/orders?view=needs-attention&q=Amara+jeans&channel=online&payment=paid&sort=total-desc&order=LS-20481",
    );
  });
});
