import { describe, expect, it } from "vitest";
import { canTransitionOrder, getPermittedOrderTransitions } from "@/modules/orders/rules";

describe("order transition rules", () => {
  it("prohibits returns before the order has been delivered", () => {
    expect(canTransitionOrder("dispatched", "returned")).toBe(false);
    expect(canTransitionOrder("out-for-delivery", "returned")).toBe(false);
    expect(getPermittedOrderTransitions("dispatched")).not.toContain("returned");
    expect(getPermittedOrderTransitions("out-for-delivery")).not.toContain("returned");
  });

  it("permits a return after delivered or refunded state", () => {
    expect(canTransitionOrder("delivered", "returned")).toBe(true);
    expect(canTransitionOrder("refunded", "returned")).toBe(true);
  });
});
