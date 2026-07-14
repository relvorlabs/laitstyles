import { err, ok, type Result } from "@/lib/control-room/result";
import { canTransitionOrder, inferOrderLineStockState } from "@/lib/control-room/sales-selectors";
import {
  applySalesStockMutation,
  type SalesStockMutationKind,
} from "@/lib/control-room/sales-stock";
import type {
  ControlRoomOrder,
  ControlRoomState,
  OrderLine,
  OrderLineStockState,
  OrderStatus,
  OrderTransitionSuccess,
  PaymentStatus,
  SalesActionError,
  StockMovement,
  StockMovementKind,
} from "@/lib/control-room/types";

export type OrderTransitionStateResult = {
  state: ControlRoomState;
  action: OrderTransitionSuccess;
};

export function applyOrderTransition(
  state: ControlRoomState,
  orderId: string,
  nextStatus: OrderStatus,
  now: string,
  idFactory: (prefix: string) => string = createActionId,
): Result<OrderTransitionStateResult, SalesActionError> {
  const order = state.orders.find((item) => item.id === orderId);
  if (!order) {
    return err({
      code: "order-not-found",
      message: "The selected order could not be found.",
      orderId,
    });
  }

  if (!canTransitionOrder(order.fulfilmentStatus, nextStatus)) {
    return err({
      code: "invalid-order-transition",
      message: `${formatOrderStatus(order.fulfilmentStatus)} cannot move directly to ${formatOrderStatus(nextStatus)}.`,
      orderId,
    });
  }

  const stockPlan = buildOrderStockPlan(order, nextStatus);
  let products = state.products;
  const movements: StockMovement[] = [];
  const nextLines: OrderLine[] = [];

  for (const plannedLine of stockPlan) {
    if (plannedLine.mutation) {
      const result = applySalesStockMutation(products, {
        productId: plannedLine.line.productId,
        variantId: plannedLine.line.variantId,
        quantity: plannedLine.line.quantity,
        kind: plannedLine.mutation,
      });
      if (!result.ok) return result;
      products = result.value.products;
      movements.push({
        id: idFactory("movement"),
        productId: plannedLine.line.productId,
        variantId: plannedLine.line.variantId ?? null,
        kind: getMovementKind(plannedLine.mutation),
        quantity: plannedLine.line.quantity,
        occurredAt: now,
        actor: "Store owner",
        note: `${order.id} moved to ${formatOrderStatus(nextStatus)}.`,
      });
    }

    nextLines.push({
      ...plannedLine.line,
      stockState: plannedLine.nextStockState,
    });
  }

  const nextPaymentStatus = getNextPaymentStatus(order.paymentStatus, nextStatus);
  const updatedOrder: ControlRoomOrder = {
    ...order,
    fulfilmentStatus: nextStatus,
    paymentStatus: nextPaymentStatus,
    lines: nextLines,
    attention: getNextAttention(order, nextStatus, nextPaymentStatus),
    timeline: [
      ...(order.timeline ?? []),
      {
        id: idFactory("order-event"),
        status: nextStatus,
        occurredAt: now,
        actor: "Store owner",
        note: `Order moved from ${formatOrderStatus(order.fulfilmentStatus)} to ${formatOrderStatus(nextStatus)}.`,
      },
    ],
  };
  const message = `${order.id} moved to ${formatOrderStatus(nextStatus)}.`;

  return ok({
    state: {
      ...state,
      asOf: now,
      products,
      orders: state.orders.map((item) => (item.id === order.id ? updatedOrder : item)),
      stockMovements: [...movements, ...state.stockMovements],
      activities: [
        {
          id: idFactory("activity"),
          kind: "order",
          title: message,
          detail: getTransitionActivityDetail(order, nextStatus),
          occurredAt: now,
          orderId: order.id,
          customerId: order.customerId ?? undefined,
        },
        ...state.activities,
      ],
    },
    action: { order: updatedOrder, message },
  });
}

type PlannedOrderLine = {
  line: OrderLine;
  mutation: SalesStockMutationKind | null;
  nextStockState: OrderLineStockState;
};

function buildOrderStockPlan(order: ControlRoomOrder, nextStatus: OrderStatus): PlannedOrderLine[] {
  return order.lines.map((line) => {
    const currentState = inferOrderLineStockState(order, line);

    if (nextStatus === "payment-confirmed") {
      if (currentState === "reserved") {
        return { line, mutation: "sell-reserved", nextStockState: "sold" };
      }
      if (currentState === "uncommitted") {
        return { line, mutation: "sell-available", nextStockState: "sold" };
      }
      return { line, mutation: null, nextStockState: currentState };
    }

    if (nextStatus === "cancelled") {
      if (currentState === "reserved") {
        return { line, mutation: "release", nextStockState: "released" };
      }
      if (currentState === "sold") {
        return { line, mutation: "restore-sold", nextStockState: "released" };
      }
      return { line, mutation: null, nextStockState: "released" };
    }

    if (nextStatus === "refunded") {
      if (currentState === "reserved") {
        return { line, mutation: "release", nextStockState: "released" };
      }
      if (currentState === "sold" && order.fulfilmentStatus !== "delivered") {
        return { line, mutation: "restore-sold", nextStockState: "released" };
      }
      return { line, mutation: null, nextStockState: currentState };
    }

    if (nextStatus === "returned") {
      if (currentState === "sold") {
        return { line, mutation: "return-sold", nextStockState: "returned" };
      }
      if (currentState === "reserved") {
        return { line, mutation: "release", nextStockState: "released" };
      }
      return { line, mutation: null, nextStockState: currentState };
    }

    return { line, mutation: null, nextStockState: currentState };
  });
}

function getMovementKind(mutation: SalesStockMutationKind): StockMovementKind {
  switch (mutation) {
    case "reserve":
      return "reserved";
    case "release":
      return "released";
    case "sell-available":
    case "sell-reserved":
      return "sold";
    case "restore-sold":
      return "adjusted";
    case "return-sold":
      return "returned";
    case "restock-returned":
      return "restocked";
    case "damage-returned":
      return "damaged";
  }
}

function getNextPaymentStatus(
  currentStatus: PaymentStatus,
  nextStatus: OrderStatus,
): PaymentStatus {
  if (nextStatus === "payment-confirmed" && currentStatus !== "deposit") {
    return "paid";
  }
  if (nextStatus === "refunded") return "refunded";
  return currentStatus;
}

function getNextAttention(
  order: ControlRoomOrder,
  nextStatus: OrderStatus,
  paymentStatus: PaymentStatus,
) {
  if (paymentStatus === "failed" || nextStatus === "pending-payment") {
    return "payment" as const;
  }
  if (nextStatus === "preparing") return "packing" as const;
  if (nextStatus === "dispatched" || nextStatus === "out-for-delivery") {
    return order.attention === "delivery" ? "delivery" : undefined;
  }
  if (nextStatus === "returned") return "return" as const;
  return undefined;
}

function getTransitionActivityDetail(order: ControlRoomOrder, nextStatus: OrderStatus) {
  const quantity = order.lines.reduce((total, line) => total + line.quantity, 0);
  return `${quantity} unit${quantity === 1 ? "" : "s"} · ${order.deliveryCity || "No delivery city"} · ${formatOrderStatus(nextStatus)}`;
}

export function formatOrderStatus(status: OrderStatus) {
  return status.replaceAll("-", " ");
}

function createActionId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}
