import { describe, expect, it } from "vitest";
import { applyHoldConversion, applyHoldRelease } from "@/lib/control-room/hold-actions";
import { applyOfflineSale } from "@/lib/control-room/offline-sale-actions";
import { applyOrderTransition } from "@/lib/control-room/order-actions";
import { applyCreateReturn, applyReturnTransition } from "@/lib/control-room/return-actions";
import { getRevenueByChannel } from "@/lib/control-room/sales-selectors";
import { applySalesStockMutation } from "@/lib/control-room/sales-stock";
import { activeControlRoomSeed } from "@/lib/control-room/seed";
import type {
  ControlRoomOrder,
  ControlRoomState,
  InventoryProduct,
} from "@/lib/control-room/types";

const now = "2026-07-09T17:30:00+01:00";

function idFactory() {
  let index = 0;
  return (prefix: string) => `${prefix}-phase4-${++index}`;
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

describe("sales stock mutations", () => {
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

describe("order transitions", () => {
  it("marks stock as sold when a pending order becomes payment confirmed", () => {
    const result = applyOrderTransition(
      activeControlRoomSeed,
      "LS-20479",
      "payment-confirmed",
      now,
      idFactory(),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const tote = productById(result.value.state, "canvas-carry-tote");
    expect(stockFor(tote)).toMatchObject({
      available: 2,
      reserved: 2,
      sold: 16,
    });
    expect(result.value.action.order.paymentStatus).toBe("paid");
    expect(result.value.action.order.lines[0]?.stockState).toBe("sold");
  });

  it("restores sold stock when a paid order is cancelled before dispatch", () => {
    const result = applyOrderTransition(
      activeControlRoomSeed,
      "LS-20481",
      "cancelled",
      now,
      idFactory(),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(stockFor(productById(result.value.state, "botanical-jeans"))).toMatchObject({
      available: 30,
      sold: 17,
    });
    expect(
      stockFor(productById(result.value.state, "ribbed-studio-tank"), "tank-m-cream"),
    ).toMatchObject({ available: 7, sold: 2 });
    expect(result.value.action.order.lines.every((line) => line.stockState === "released")).toBe(
      true,
    );
  });

  it("rejects skipped fulfilment transitions", () => {
    const result = applyOrderTransition(
      activeControlRoomSeed,
      "LS-20481",
      "delivered",
      now,
      idFactory(),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("invalid-order-transition");
  });
});

describe("hold actions", () => {
  it("releases reserved stock back to availability", () => {
    const result = applyHoldRelease(
      activeControlRoomSeed,
      "hold-botanical",
      "2026-07-09T11:30:00+01:00",
      idFactory(),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const product = productById(result.value.state, "botanical-jeans");
    expect(stockFor(product)).toMatchObject({ available: 31, reserved: 1 });
    expect(result.value.action.hold.status).toBe("released");
  });

  it("converts a paid hold from reserved stock into sold stock", () => {
    const result = applyHoldConversion(
      activeControlRoomSeed,
      {
        holdId: "hold-tank",
        paymentMethod: "bank-transfer",
        paymentStatus: "paid",
        deliveryCity: "Lekki",
        notes: "Converted after transfer confirmation.",
      },
      "2026-07-09T11:35:00+01:00",
      idFactory(),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const after = stockFor(productById(result.value.state, "ribbed-studio-tank"), "tank-s-cream");
    expect(after).toMatchObject({ available: 2, reserved: 0, sold: 6 });
    expect(result.value.action.hold.status).toBe("converted");
    expect(result.value.action.order?.lines[0]?.stockState).toBe("sold");
  });

  it("keeps stock reserved when a hold becomes a pending-payment order", () => {
    const before = stockFor(productById(activeControlRoomSeed, "botanical-jeans"));
    const result = applyHoldConversion(
      activeControlRoomSeed,
      {
        holdId: "hold-botanical",
        paymentMethod: "bank-transfer",
        paymentStatus: "pending",
        deliveryCity: "Ikeja",
        notes: "Waiting for transfer.",
      },
      "2026-07-09T11:30:00+01:00",
      idFactory(),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(stockFor(productById(result.value.state, "botanical-jeans"))).toEqual(before);
    expect(result.value.action.order?.lines[0]?.stockState).toBe("reserved");
    expect(result.value.action.order?.fulfilmentStatus).toBe("pending-payment");
  });
});

describe("offline sales", () => {
  it("records a paid unique-piece sale and prevents a second sale", () => {
    const first = applyOfflineSale(
      activeControlRoomSeed,
      {
        lines: [
          {
            productId: "nature-utility-vest",
            quantity: 1,
            unitPrice: 30000,
          },
        ],
        channel: "physical-store",
        customer: { kind: "existing", customerId: "customer-musa" },
        paymentMethod: "pos",
        paymentStatus: "paid",
        notes: "Walk-in purchase.",
      },
      now,
      idFactory(),
    );

    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const soldProduct = productById(first.value.state, "nature-utility-vest");
    expect(stockFor(soldProduct)).toMatchObject({ available: 0, sold: 1 });
    expect(first.value.action.order.source).toBe("offline-sale");
    expect(first.value.action.order.fulfilmentStatus).toBe("delivered");

    const second = applyOfflineSale(
      first.value.state,
      {
        lines: [
          {
            productId: "nature-utility-vest",
            quantity: 1,
            unitPrice: 30000,
          },
        ],
        channel: "physical-store",
        customer: { kind: "existing", customerId: "customer-amara" },
        paymentMethod: "cash",
        paymentStatus: "paid",
        notes: "Should not be possible.",
      },
      now,
      idFactory(),
    );

    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.error.code).toBe("insufficient-available-stock");
    }
  });

  it("adds paid offline revenue without changing online revenue", () => {
    const before = getRevenueByChannel(activeControlRoomSeed.orders);
    const result = applyOfflineSale(
      activeControlRoomSeed,
      {
        lines: [
          {
            productId: "botanical-jeans",
            quantity: 1,
            unitPrice: 28000,
          },
        ],
        channel: "whatsapp",
        customer: { kind: "existing", customerId: "customer-amara" },
        paymentMethod: "bank-transfer",
        paymentStatus: "paid",
        notes: "WhatsApp-assisted sale.",
      },
      now,
      idFactory(),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const after = getRevenueByChannel(result.value.state.orders);
    expect(after.online).toBe(before.online);
    expect(after.offline).toBe(before.offline + 28000);
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
    const approved = applyReturnTransition(
      opened.value.state,
      returnId,
      "approved",
      now,
      idFactory(),
    );
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;

    const received = applyReturnTransition(
      approved.value.state,
      returnId,
      "received",
      now,
      idFactory(),
    );
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
    if (!result.ok) {
      expect(result.error.code).toBe("invalid-return-transition");
    }
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
    const approved = applyReturnTransition(
      opened.value.state,
      returnId,
      "approved",
      now,
      idFactory(),
    );
    if (!approved.ok) throw new Error(approved.error.message);
    const received = applyReturnTransition(
      approved.value.state,
      returnId,
      "received",
      now,
      idFactory(),
    );
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
