import type { OrderStatus } from "@/modules/orders/types";

export const orderTransitionMap = {
  "pending-payment": ["payment-confirmed", "cancelled"],
  "payment-confirmed": ["preparing", "cancelled", "refunded"],
  preparing: ["packed", "cancelled", "refunded"],
  packed: ["ready-for-pickup", "dispatched", "cancelled", "refunded"],
  "ready-for-pickup": ["delivered", "cancelled", "refunded"],
  dispatched: ["out-for-delivery", "delivered"],
  "out-for-delivery": ["delivered"],
  delivered: ["returned", "refunded"],
  cancelled: [],
  refunded: ["returned"],
  returned: [],
} satisfies Record<OrderStatus, OrderStatus[]>;

export function getPermittedOrderTransitions(status: OrderStatus) {
  return orderTransitionMap[status] as readonly OrderStatus[];
}

export function canTransitionOrder(status: OrderStatus, nextStatus: OrderStatus) {
  return getPermittedOrderTransitions(status).includes(nextStatus);
}

export function formatOrderStatus(status: OrderStatus) {
  return status.replaceAll("-", " ");
}
