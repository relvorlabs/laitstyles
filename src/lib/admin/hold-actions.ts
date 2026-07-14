import { err, ok, type Result } from "@/lib/control-room/result";
import { isHoldActive } from "@/lib/control-room/sales-selectors";
import { applySalesStockMutation } from "@/lib/control-room/sales-stock";
import type {
  ControlRoomHold,
  ControlRoomOrder,
  ControlRoomState,
  ConvertHoldInput,
  HoldActionSuccess,
  PaymentStatus,
  SalesActionError,
  StockMovement,
} from "@/lib/control-room/types";

export type HoldActionStateResult = {
  state: ControlRoomState;
  action: HoldActionSuccess;
};

export function applyHoldExtension(
  state: ControlRoomState,
  holdId: string,
  minutes: number,
  now: string,
  idFactory: (prefix: string) => string = createActionId,
): Result<HoldActionStateResult, SalesActionError> {
  const holdResult = getActiveHold(state, holdId, now);
  if (!holdResult.ok) return holdResult;

  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 24 * 60) {
    return err({
      code: "invalid-hold-extension",
      message: "Choose a hold extension between one minute and 24 hours.",
      field: "minutes",
      holdId,
      requested: minutes,
    });
  }

  const hold = holdResult.value;
  const baseTime = Math.max(new Date(hold.expiresAt).getTime(), new Date(now).getTime());
  const updatedHold: ControlRoomHold = {
    ...hold,
    expiresAt: new Date(baseTime + minutes * 60 * 1000).toISOString(),
    status: "active",
  };
  const message = `${hold.customerLabel}'s hold was extended by ${minutes} minute${minutes === 1 ? "" : "s"}.`;

  return ok({
    state: {
      ...state,
      asOf: now,
      holds: replaceHold(state.holds, updatedHold),
      activities: [
        {
          id: idFactory("activity"),
          kind: "hold",
          title: "Hold extended",
          detail: message,
          occurredAt: now,
          productId: hold.productId,
          customerId: hold.customerId,
        },
        ...state.activities,
      ],
    },
    action: { hold: updatedHold, message },
  });
}

export function applyHoldRelease(
  state: ControlRoomState,
  holdId: string,
  now: string,
  idFactory: (prefix: string) => string = createActionId,
): Result<HoldActionStateResult, SalesActionError> {
  const holdResult = getActiveHold(state, holdId, now);
  if (!holdResult.ok) return holdResult;
  const hold = holdResult.value;

  const stockResult = applySalesStockMutation(state.products, {
    productId: hold.productId,
    variantId: hold.variantId,
    quantity: hold.quantity,
    kind: "release",
  });
  if (!stockResult.ok) return stockResult;

  const updatedHold: ControlRoomHold = {
    ...hold,
    status: "released",
    releasedAt: now,
  };
  const movement: StockMovement = {
    id: idFactory("movement"),
    productId: hold.productId,
    variantId: hold.variantId ?? null,
    kind: "released",
    quantity: hold.quantity,
    occurredAt: now,
    actor: "Store owner",
    note: `Hold ${hold.id} was released.`,
  };
  const message = `${hold.customerLabel}'s hold was released and the stock is available again.`;

  return ok({
    state: {
      ...state,
      asOf: now,
      products: stockResult.value.products,
      holds: replaceHold(state.holds, updatedHold),
      stockMovements: [movement, ...state.stockMovements],
      activities: [
        {
          id: idFactory("activity"),
          kind: "hold",
          title: "Hold released",
          detail: message,
          occurredAt: now,
          productId: hold.productId,
          customerId: hold.customerId,
        },
        ...state.activities,
      ],
    },
    action: { hold: updatedHold, message },
  });
}

export function applyHoldConversion(
  state: ControlRoomState,
  input: ConvertHoldInput,
  now: string,
  idFactory: (prefix: string) => string = createActionId,
): Result<HoldActionStateResult, SalesActionError> {
  const holdResult = getActiveHold(state, input.holdId, now);
  if (!holdResult.ok) return holdResult;
  const hold = holdResult.value;
  const product = state.products.find((item) => item.id === hold.productId);
  if (!product) {
    return err({
      code: "product-not-found",
      message: "The held product could not be found.",
      productId: hold.productId,
      holdId: hold.id,
    });
  }

  if (hold.customerId) {
    const customerExists = state.customers.some((customer) => customer.id === hold.customerId);
    if (!customerExists) {
      return err({
        code: "customer-not-found",
        message: "The customer attached to this hold could not be found.",
        holdId: hold.id,
      });
    }
  }

  const priceResult = getHeldUnitPrice(product, hold.variantId);
  if (!priceResult.ok) return priceResult;

  const paymentConfirmed = input.paymentStatus !== "pending";
  const stockResult = paymentConfirmed
    ? applySalesStockMutation(state.products, {
        productId: hold.productId,
        variantId: hold.variantId,
        quantity: hold.quantity,
        kind: "sell-reserved",
      })
    : ok({ products: state.products, product });
  if (!stockResult.ok) return stockResult;

  const orderId = createOrderId(idFactory);
  const fulfilmentStatus = getConvertedOrderStatus(input.paymentStatus);
  const order: ControlRoomOrder = {
    id: orderId,
    customerId: hold.customerId ?? null,
    customerLabel: hold.customerLabel,
    source: "hold-conversion",
    channel: getHoldOrderChannel(hold),
    paymentStatus: input.paymentStatus,
    paymentMethod: input.paymentMethod,
    fulfilmentStatus,
    lines: [
      {
        id: idFactory("order-line"),
        productId: hold.productId,
        variantId: hold.variantId,
        quantity: hold.quantity,
        unitPrice: priceResult.value,
        stockState: paymentConfirmed ? "sold" : "reserved",
      },
    ],
    total: priceResult.value * hold.quantity,
    placedAt: now,
    deliveryCity: input.deliveryCity,
    deliveryAddress: null,
    courier: null,
    notes: input.notes,
    attention: input.paymentStatus === "pending" ? "payment" : undefined,
    timeline: [
      {
        id: idFactory("order-event"),
        status: fulfilmentStatus,
        occurredAt: now,
        actor: "Store owner",
        note: paymentConfirmed
          ? `Converted from hold ${hold.id}; reserved stock became sold when payment was confirmed.`
          : `Converted from hold ${hold.id}; reserved stock remains attached to the pending order.`,
      },
    ],
    payments: [
      {
        id: idFactory("payment-event"),
        status: input.paymentStatus,
        method: input.paymentMethod,
        amount: input.paymentStatus === "pending" ? 0 : priceResult.value * hold.quantity,
        occurredAt: now,
        note: "Payment state captured when the hold was converted.",
      },
    ],
  };
  const updatedHold: ControlRoomHold = {
    ...hold,
    status: "converted",
    convertedOrderId: order.id,
    releasedAt: now,
  };
  const movement: StockMovement | null = paymentConfirmed
    ? {
        id: idFactory("movement"),
        productId: hold.productId,
        variantId: hold.variantId ?? null,
        kind: "sold",
        quantity: hold.quantity,
        occurredAt: now,
        actor: "Store owner",
        note: `Hold ${hold.id} converted to paid order ${order.id}.`,
      }
    : null;
  const message = `${hold.customerLabel}'s hold was converted to order ${order.id}.`;

  return ok({
    state: {
      ...state,
      asOf: now,
      products: stockResult.value.products,
      holds: replaceHold(state.holds, updatedHold),
      orders: [order, ...state.orders],
      stockMovements: movement ? [movement, ...state.stockMovements] : state.stockMovements,
      activities: [
        {
          id: idFactory("activity"),
          kind: "order",
          title: `Hold converted to ${order.id}`,
          detail: `${hold.quantity} unit${hold.quantity === 1 ? "" : "s"} · ${hold.customerLabel}`,
          occurredAt: now,
          productId: hold.productId,
          orderId: order.id,
          customerId: hold.customerId,
        },
        ...state.activities,
      ],
    },
    action: { hold: updatedHold, order, message },
  });
}

function getActiveHold(
  state: ControlRoomState,
  holdId: string,
  now: string,
): Result<ControlRoomHold, SalesActionError> {
  const hold = state.holds.find((item) => item.id === holdId);
  if (!hold) {
    return err({
      code: "hold-not-found",
      message: "The selected hold could not be found.",
      holdId,
    });
  }
  if (!isHoldActive(hold, now)) {
    return err({
      code: "hold-inactive",
      message: "This hold has expired or has already been released or converted.",
      holdId,
    });
  }
  return ok(hold);
}

function getHeldUnitPrice(
  product: ControlRoomState["products"][number],
  variantId?: string,
): Result<number, SalesActionError> {
  if (product.inventoryMode !== "variant") {
    if (variantId) {
      return err({
        code: "variant-not-allowed",
        message: "This held product does not use variants.",
        productId: product.id,
        variantId,
      });
    }
    return ok(product.price);
  }

  if (!variantId) {
    return err({
      code: "variant-required",
      message: "The hold must identify the exact product variant.",
      productId: product.id,
    });
  }
  const variant = product.variants.find((item) => item.id === variantId);
  if (!variant) {
    return err({
      code: "variant-not-found",
      message: "The held product variant could not be found.",
      productId: product.id,
      variantId,
    });
  }
  return ok(variant.price ?? product.price);
}

function getConvertedOrderStatus(paymentStatus: PaymentStatus) {
  return paymentStatus === "pending"
    ? ("pending-payment" as const)
    : ("payment-confirmed" as const);
}

function getHoldOrderChannel(hold: ControlRoomHold) {
  if (hold.source === "storefront") return "online" as const;
  if (hold.source === "admin") return "staff-assisted" as const;
  return hold.source;
}

function replaceHold(holds: ControlRoomHold[], hold: ControlRoomHold) {
  return holds.map((item) => (item.id === hold.id ? hold : item));
}

function createOrderId(idFactory: (prefix: string) => string) {
  return `LS-${idFactory("order").replace(/\D/g, "").slice(-5).padStart(5, "0")}`;
}

function createActionId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}
