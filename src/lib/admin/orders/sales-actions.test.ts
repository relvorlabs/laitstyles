import { describe, expect, it } from "vitest";
import { getRevenueByChannel } from "@/lib/admin/orders/sales-selectors";
import { applySalesStockMutation } from "@/lib/admin/orders/sales-stock";
import { applyCreateReturn, applyReturnTransition } from "@/lib/admin/returns/return-reducer";
import { activeControlRoomSeed } from "@/lib/admin/shared/seed";
import type {
  ControlRoomOrder,
  ControlRoomState,
  InventoryProduct,
} from "@/lib/admin/shared/types";

const now = "2026-07-09T17:30:00+01:00";

function idFactory() {
  let index = 0;
  return (prefix: string) => `${prefix}-phase5-${++index}`;
}

function productById(state: ControlRoomState, id: string) {
  const product = state.products.find((item) => item.id === id);
  if (!product) throw new Error(`Missing product ${id}`);
  return product;
}

function orderById(state: ControlRoomState, id: string) {
  const order = state.orders.find((item) => item.id === id);
  if (!order) throw new Error(`Missing order ${id}`);
  return order;
}

function stockFor(product: InventoryProduct, variantId?: string) {
  if (product.inventoryMode !== "variant") return product.stock;
  const variant = product.variants.find((item) => item.id === variantId);
  if (!variant) throw new Error(`Missing variant ${variantId}`);
  return variant.stock;
}

describe("legacy return stock support", () => {
  it("reserves and releases only the requested stocked quantity", () => {
    const reserved = applySalesStockMutation(activeControlRoomSeed.products, {
      productId: "botanical-jeans",
      quantity: 2,
      kind: "reserve",
    });
    expect(reserved.ok).toBe(true);
    if (!reserved.ok) return;
    expect(stockFor(reserved.value.product)).toEqual({
      totalReceived: 50,
      available: 27,
      reserved: 5,
      sold: 18,
      returned: 0,
      damaged: 0,
    });

    const released = applySalesStockMutation(reserved.value.products, {
      productId: "botanical-jeans",
      quantity: 2,
      kind: "release",
    });
    expect(released.ok).toBe(true);
    if (!released.ok) return;
    expect(stockFor(released.value.product)).toEqual({
      totalReceived: 50,
      available: 29,
      reserved: 3,
      sold: 18,
      returned: 0,
      damaged: 0,
    });
  });

  it("mutates only the selected variant", () => {
    const result = applySalesStockMutation(activeControlRoomSeed.products, {
      productId: "ribbed-studio-tank",
      variantId: "tank-m-cream",
      quantity: 2,
      kind: "sell-available",
    });
    expect(result.ok).toBe(true);
    if (!result.ok || result.value.product.inventoryMode !== "variant") return;
    expect(stockFor(result.value.product, "tank-m-cream")).toEqual({
      totalReceived: 10,
      available: 4,
      reserved: 1,
      sold: 5,
      returned: 0,
      damaged: 0,
    });
    expect(stockFor(result.value.product, "tank-s-cream")).toEqual({
      totalReceived: 8,
      available: 2,
      reserved: 1,
      sold: 5,
      returned: 0,
      damaged: 0,
    });
  });

  it("prevents selling a unique piece whose only unit is already held", () => {
    const result = applySalesStockMutation(activeControlRoomSeed.products, {
      productId: "sage-field-vest",
      quantity: 1,
      kind: "sell-available",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("insufficient-available-stock");
      expect(result.error.available).toBe(0);
    }
  });
});

describe("returns", () => {
  it("moves sold stock through returned and restocked buckets", () => {
    const opened = applyCreateReturn(
      activeControlRoomSeed,
      {
        orderId: "LS-20472",
        reason: "Size did not work",
        note: "Item came back in resellable condition.",
        lines: [{ orderLineId: "line-20472-1", quantity: 1 }],
      },
      now,
      idFactory(),
    );
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;

    const returnId = opened.value.action.returnRecord.id;
    const approved = applyReturnTransition(opened.value.state, returnId, "approved", now, idFactory());
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    const received = applyReturnTransition(approved.value.state, returnId, "received", now, idFactory());
    expect(received.ok).toBe(true);
    if (!received.ok) return;
    expect(stockFor(productById(received.value.state, "botanical-jeans"))).toMatchObject({
      sold: 17,
      returned: 1,
    });
    const inspecting = applyReturnTransition(
      received.value.state,
      returnId,
      "inspecting",
      now,
      idFactory(),
    );
    expect(inspecting.ok).toBe(true);
    if (!inspecting.ok) return;
    const restocked = applyReturnTransition(
      inspecting.value.state,
      returnId,
      "restocked",
      now,
      idFactory(),
    );
    expect(restocked.ok).toBe(true);
    if (!restocked.ok) return;
    expect(stockFor(productById(restocked.value.state, "botanical-jeans"))).toMatchObject({
      available: 30,
      sold: 17,
      returned: 0,
    });
    expect(orderById(restocked.value.state, "LS-20472").fulfilmentStatus).toBe("returned");
  });

  it("prevents returns above the remaining eligible order quantity", () => {
    const result = applyCreateReturn(
      activeControlRoomSeed,
      {
        orderId: "LS-20472",
        reason: "Invalid quantity test",
        note: "",
        lines: [{ orderLineId: "line-20472-1", quantity: 2 }],
      },
      now,
      idFactory(),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("return-quantity-exceeded");
      expect(result.error.available).toBe(1);
    }
  });

  it("rejects a return before the order is delivered", () => {
    const result = applyCreateReturn(
      activeControlRoomSeed,
      {
        orderId: "LS-20481",
        reason: "Should be cancellation instead",
        note: "",
        lines: [{ orderLineId: "line-20481-1", quantity: 1 }],
      },
      now,
      idFactory(),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("invalid-return-transition");
  });

  it("subtracts a partial refund from net revenue without closing the full order", () => {
    const sourceOrder = orderById(activeControlRoomSeed, "LS-20481");
    const deliveredOrder: ControlRoomOrder = {
      ...sourceOrder,
      id: "LS-PARTIAL-REFUND",
      fulfilmentStatus: "delivered",
      attention: undefined,
      lines: sourceOrder.lines.map((line) => ({ ...line, stockState: "sold" })),
    };
    const state: ControlRoomState = {
      ...activeControlRoomSeed,
      orders: [deliveredOrder, ...activeControlRoomSeed.orders],
    };
    const revenueBefore = getRevenueByChannel(state.orders);
    const opened = applyCreateReturn(
      state,
      {
        orderId: deliveredOrder.id,
        reason: "One item was unsuitable",
        note: "Partial order return.",
        lines: [{ orderLineId: "line-20481-1", quantity: 1 }],
      },
      now,
      idFactory(),
    );
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    const returnId = opened.value.action.returnRecord.id;
    const approved = applyReturnTransition(opened.value.state, returnId, "approved", now, idFactory());
    if (!approved.ok) throw new Error(approved.error.message);
    const received = applyReturnTransition(approved.value.state, returnId, "received", now, idFactory());
    if (!received.ok) throw new Error(received.error.message);
    const inspecting = applyReturnTransition(
      received.value.state,
      returnId,
      "inspecting",
      now,
      idFactory(),
    );
    if (!inspecting.ok) throw new Error(inspecting.error.message);
    const refunded = applyReturnTransition(
      inspecting.value.state,
      returnId,
      "refunded",
      now,
      idFactory(),
    );
    expect(refunded.ok).toBe(true);
    if (!refunded.ok) return;
    const order = orderById(refunded.value.state, deliveredOrder.id);
    const revenueAfter = getRevenueByChannel(refunded.value.state.orders);
    expect(order.refundedAmount).toBe(28500);
    expect(order.paymentStatus).toBe("paid");
    expect(order.fulfilmentStatus).toBe("delivered");
    expect(revenueAfter.online).toBe(revenueBefore.online - 28500);
  });
});
