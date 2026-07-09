import type {
  ControlRoomHold,
  ControlRoomOrder,
  ControlRoomReturn,
  ControlRoomState,
  OrderLine,
  OrderLineStockState,
  OrderStatus,
  ReturnStatus,
} from "@/lib/control-room/types";

const paidPaymentStates = new Set(["paid", "deposit"] as const);

export const orderTransitionMap = {
  "pending-payment": ["payment-confirmed", "cancelled"],
  "payment-confirmed": ["preparing", "cancelled", "refunded"],
  preparing: ["packed", "cancelled", "refunded"],
  packed: ["ready-for-pickup", "dispatched", "cancelled", "refunded"],
  "ready-for-pickup": ["delivered", "cancelled", "refunded"],
  dispatched: ["out-for-delivery", "delivered", "returned"],
  "out-for-delivery": ["delivered", "returned"],
  delivered: ["returned", "refunded"],
  cancelled: [],
  refunded: ["returned"],
  returned: [],
} satisfies Record<OrderStatus, OrderStatus[]>;

export const returnTransitionMap = {
  requested: ["approved", "rejected"],
  approved: ["received", "rejected"],
  received: ["inspecting"],
  inspecting: ["refunded", "restocked", "damaged"],
  refunded: ["restocked", "damaged", "closed"],
  restocked: ["closed"],
  damaged: ["closed"],
  rejected: ["closed"],
  closed: [],
} satisfies Record<ReturnStatus, ReturnStatus[]>;

export function getPermittedOrderTransitions(status: OrderStatus) {
  return orderTransitionMap[status] as readonly OrderStatus[];
}

export function canTransitionOrder(
  status: OrderStatus,
  nextStatus: OrderStatus,
) {
  return getPermittedOrderTransitions(status).includes(nextStatus);
}

export function getPermittedReturnTransitions(status: ReturnStatus) {
  return returnTransitionMap[status] as readonly ReturnStatus[];
}

export function canTransitionReturn(
  status: ReturnStatus,
  nextStatus: ReturnStatus,
) {
  return getPermittedReturnTransitions(status).includes(nextStatus);
}

export function inferOrderLineStockState(
  order: ControlRoomOrder,
  line: OrderLine,
): OrderLineStockState {
  if (line.stockState) return line.stockState;

  if (order.fulfilmentStatus === "cancelled") return "released";
  if (order.fulfilmentStatus === "refunded") return "released";
  if (order.fulfilmentStatus === "returned") return "returned";
  if (order.fulfilmentStatus === "pending-payment") return "uncommitted";
  return "sold";
}

export function isHoldActive(hold: ControlRoomHold, asOf: string) {
  return (
    (hold.status ?? "active") === "active" &&
    new Date(hold.expiresAt).getTime() > new Date(asOf).getTime()
  );
}

export function getActiveSalesHolds(state: ControlRoomState) {
  return state.holds.filter((hold) => isHoldActive(hold, state.asOf));
}

export function getHoldRisk(
  hold: ControlRoomHold,
  asOf: string,
): "stable" | "expiring" | "expired" | "payment-risk" {
  if ((hold.status ?? "active") !== "active") return "expired";

  const remaining =
    new Date(hold.expiresAt).getTime() - new Date(asOf).getTime();
  if (remaining <= 0) return "expired";
  if (hold.paymentProgress === "failed") return "payment-risk";
  if (remaining <= 5 * 60 * 1000) return "expiring";
  return "stable";
}

export function getPaidOrders(orders: ControlRoomOrder[]) {
  return orders.filter(
    (order) =>
      paidPaymentStates.has(order.paymentStatus as "paid" | "deposit") &&
      order.fulfilmentStatus !== "cancelled" &&
      order.fulfilmentStatus !== "refunded",
  );
}

export function getRevenueByChannel(orders: ControlRoomOrder[]) {
  const paidOrders = getPaidOrders(orders);
  let online = 0;
  let offline = 0;

  for (const order of paidOrders) {
    if (order.channel === "online") online += order.total;
    else offline += order.total;
  }

  return { online, offline, total: online + offline };
}

export function getReturnedQuantityForOrderLine(
  returns: ControlRoomReturn[],
  orderId: string,
  orderLineId: string,
) {
  let quantity = 0;

  for (const returnRecord of returns) {
    if (
      returnRecord.orderId !== orderId ||
      returnRecord.status === "rejected"
    ) {
      continue;
    }

    for (const line of returnRecord.lines) {
      if (line.orderLineId === orderLineId) quantity += line.quantity;
    }
  }

  return quantity;
}
