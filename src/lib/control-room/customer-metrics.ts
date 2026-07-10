import type {
  ControlRoomHold,
  ControlRoomOrder,
  ControlRoomReturn,
  ControlRoomState,
  CustomerAttentionReason,
  CustomerMetrics,
  CustomerSegment,
} from "@/lib/control-room/types";
import {
  getHoldRisk,
  getOrderNetRevenue,
  getPaidOrders,
  isHoldActive,
} from "@/lib/control-room/sales-selectors";

const highValueThreshold = 50_000;

export function getCustomerOrders(
  state: ControlRoomState,
  customerId: string,
): ControlRoomOrder[] {
  return state.orders.filter((order) => order.customerId === customerId);
}

export function getCustomerHolds(
  state: ControlRoomState,
  customerId: string,
): ControlRoomHold[] {
  return state.holds.filter((hold) => hold.customerId === customerId);
}

export function getCustomerReturns(
  state: ControlRoomState,
  customerId: string,
): ControlRoomReturn[] {
  return (state.returns ?? []).filter(
    (returnRecord) => returnRecord.customerId === customerId,
  );
}

export function getCustomerMetrics(
  state: ControlRoomState,
  customerId: string,
): CustomerMetrics {
  const orders = getCustomerOrders(state, customerId);
  const paidOrders = getPaidOrders(orders);
  const holds = getCustomerHolds(state, customerId);
  const returns = getCustomerReturns(state, customerId);
  const reviews = state.reviews.filter(
    (review) => review.customerId === customerId,
  );
  const lifetimeSpend = paidOrders.reduce(
    (total, order) => total + getOrderNetRevenue(order),
    0,
  );
  const lastPurchaseAt = paidOrders.reduce<string | null>(
    (latest, order) =>
      !latest || Date.parse(order.placedAt) > Date.parse(latest)
        ? order.placedAt
        : latest,
    null,
  );

  return {
    lifetimeSpend,
    averageOrderValue: paidOrders.length
      ? Math.round(lifetimeSpend / paidOrders.length)
      : 0,
    orderCount: orders.length,
    paidOrderCount: paidOrders.length,
    returnCount: returns.filter((record) => record.status !== "rejected").length,
    cancellationCount: orders.filter(
      (order) => order.fulfilmentStatus === "cancelled",
    ).length,
    activeHoldCount: holds.filter((hold) => isHoldActive(hold, state.asOf)).length,
    reviewCount: reviews.length,
    lastPurchaseAt,
  };
}

export function getCustomerAttentionReasons(
  state: ControlRoomState,
  customerId: string,
): CustomerAttentionReason[] {
  const reasons = new Set<CustomerAttentionReason>();
  const orders = getCustomerOrders(state, customerId);
  const holds = getCustomerHolds(state, customerId);
  const returns = getCustomerReturns(state, customerId);

  if (
    orders.some(
      (order) =>
        order.paymentStatus === "failed" ||
        (order.fulfilmentStatus === "pending-payment" &&
          order.attention === "payment"),
    )
  ) {
    reasons.add("payment");
  }

  if (orders.some((order) => order.attention === "delivery")) {
    reasons.add("delivery");
  }

  if (
    returns.some(
      (record) => record.status !== "closed" && record.status !== "rejected",
    )
  ) {
    reasons.add("return");
  }

  if (
    holds.some((hold) => {
      if (!isHoldActive(hold, state.asOf)) return false;
      const risk = getHoldRisk(hold, state.asOf);
      return risk === "expiring" || risk === "payment-risk";
    })
  ) {
    reasons.add("hold");
  }

  return [...reasons];
}

export function getCustomerSegments(
  metrics: CustomerMetrics,
  attention: CustomerAttentionReason[],
): CustomerSegment[] {
  const segments: CustomerSegment[] = [];

  if (attention.length) segments.push("needs-attention");
  if (metrics.lifetimeSpend >= highValueThreshold) segments.push("high-value");
  if (metrics.orderCount >= 2) segments.push("returning");
  else segments.push("new");

  return segments;
}
