import type {
  ControlRoomCustomer,
  ControlRoomHold,
  ControlRoomOrder,
  ControlRoomReturn,
  ControlRoomState,
  CustomerAttentionReason,
  CustomerDeliveryHistoryItem,
  CustomerMetrics,
  CustomerProductRelationship,
  CustomerRelationshipProfile,
  CustomerSegment,
  CustomerTimelineEvent,
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
  if (metrics.paidOrderCount >= 2) segments.push("returning");
  else segments.push("new");

  return segments;
}

export function getCustomerTimeline(
  state: ControlRoomState,
  customerId: string,
): CustomerTimelineEvent[] {
  const events: CustomerTimelineEvent[] = [];

  for (const order of getCustomerOrders(state, customerId)) {
    events.push({
      id: `customer-order-${order.id}`,
      kind: "order",
      occurredAt: order.placedAt,
      title:
        order.source === "offline-sale"
          ? `Offline sale ${order.id}`
          : `Order ${order.id} placed`,
      detail: `${order.lines.reduce((total, line) => total + line.quantity, 0)} unit${order.lines.reduce((total, line) => total + line.quantity, 0) === 1 ? "" : "s"} · ${order.channel.replaceAll("-", " ")} · ${order.paymentStatus.replaceAll("-", " ")}`,
      orderId: order.id,
    });

    for (const payment of order.payments ?? []) {
      events.push({
        id: `customer-payment-${payment.id}`,
        kind: "payment",
        occurredAt: payment.occurredAt,
        title: `Payment ${payment.status.replaceAll("-", " ")}`,
        detail: payment.note,
        orderId: order.id,
      });
    }

    for (const timelineEvent of order.timeline ?? []) {
      const deliveryStatuses = new Set([
        "dispatched",
        "out-for-delivery",
        "delivered",
      ]);
      events.push({
        id: `customer-order-event-${timelineEvent.id}`,
        kind: deliveryStatuses.has(timelineEvent.status)
          ? "delivery"
          : "order",
        occurredAt: timelineEvent.occurredAt,
        title: `Order ${timelineEvent.status.replaceAll("-", " ")}`,
        detail: timelineEvent.note,
        orderId: order.id,
      });
    }
  }

  for (const hold of getCustomerHolds(state, customerId)) {
    events.push({
      id: `customer-hold-${hold.id}`,
      kind: "hold",
      occurredAt: hold.startedAt,
      title: "Product hold started",
      detail: `${hold.quantity} unit${hold.quantity === 1 ? "" : "s"} · ${hold.source.replaceAll("-", " ")}`,
      productId: hold.productId,
      holdId: hold.id,
    });

    if (hold.releasedAt) {
      events.push({
        id: `customer-hold-release-${hold.id}`,
        kind: "hold",
        occurredAt: hold.releasedAt,
        title: "Product hold released",
        detail: hold.note || "Reserved stock returned to available inventory.",
        productId: hold.productId,
        holdId: hold.id,
      });
    }
  }

  for (const returnRecord of getCustomerReturns(state, customerId)) {
    events.push({
      id: `customer-return-${returnRecord.id}`,
      kind: "return",
      occurredAt: returnRecord.requestedAt,
      title: `Return ${returnRecord.id} requested`,
      detail: returnRecord.reason,
      orderId: returnRecord.orderId,
      returnId: returnRecord.id,
    });

    if (returnRecord.updatedAt !== returnRecord.requestedAt) {
      events.push({
        id: `customer-return-update-${returnRecord.id}`,
        kind: "return",
        occurredAt: returnRecord.updatedAt,
        title: `Return ${returnRecord.status.replaceAll("-", " ")}`,
        detail: returnRecord.note || "Return record updated.",
        orderId: returnRecord.orderId,
        returnId: returnRecord.id,
      });
    }
  }

  for (const review of state.reviews) {
    if (review.customerId !== customerId) continue;
    events.push({
      id: `customer-review-${review.id}`,
      kind: "review",
      occurredAt: review.createdAt,
      title: `${review.rating}-star product review`,
      detail: review.title,
      productId: review.productId,
    });
  }

  for (const activity of state.activities) {
    if (
      activity.customerId !== customerId ||
      (activity.kind !== "customer" && activity.kind !== "delivery")
    ) {
      continue;
    }
    events.push({
      id: `customer-activity-${activity.id}`,
      kind: activity.kind,
      occurredAt: activity.occurredAt,
      title: activity.title,
      detail: activity.detail,
      orderId: activity.orderId,
      productId: activity.productId,
    });
  }

  return events.toSorted(
    (left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt),
  );
}

export function getCustomerProductRelationships(
  state: ControlRoomState,
  customer: ControlRoomCustomer,
): CustomerProductRelationship[] {
  const relationships = new Map<string, CustomerProductRelationship>();

  function touch(productId: string, occurredAt: string) {
    const existing = relationships.get(productId);
    if (!existing) {
      const relationship: CustomerProductRelationship = {
        productId,
        purchasedQuantity: 0,
        heldQuantity: 0,
        saved: false,
        reviewed: false,
        lastInteractionAt: occurredAt,
      };
      relationships.set(productId, relationship);
      return relationship;
    }
    if (Date.parse(occurredAt) > Date.parse(existing.lastInteractionAt)) {
      existing.lastInteractionAt = occurredAt;
    }
    return existing;
  }

  for (const order of getPaidOrders(getCustomerOrders(state, customer.id))) {
    for (const line of order.lines) {
      touch(line.productId, order.placedAt).purchasedQuantity += line.quantity;
    }
  }

  for (const hold of getCustomerHolds(state, customer.id)) {
    touch(hold.productId, hold.releasedAt ?? hold.startedAt).heldQuantity +=
      hold.quantity;
  }

  for (const productId of customer.savedProductIds ?? []) {
    touch(productId, customer.createdAt ?? state.asOf).saved = true;
  }

  for (const review of state.reviews) {
    if (review.customerId !== customer.id) continue;
    touch(review.productId, review.createdAt).reviewed = true;
  }

  return [...relationships.values()].toSorted(
    (left, right) =>
      Date.parse(right.lastInteractionAt) - Date.parse(left.lastInteractionAt),
  );
}

export function getCustomerDeliveryHistory(
  state: ControlRoomState,
  customerId: string,
): CustomerDeliveryHistoryItem[] {
  return getCustomerOrders(state, customerId)
    .map((order) => ({
      orderId: order.id,
      occurredAt: order.placedAt,
      city: order.deliveryAddress?.city ?? order.deliveryCity,
      address: order.deliveryAddress ?? null,
      status: order.fulfilmentStatus,
    }))
    .toSorted(
      (left, right) =>
        Date.parse(right.occurredAt) - Date.parse(left.occurredAt),
    );
}

export function getCustomerRelationshipProfile(
  state: ControlRoomState,
  customerId: string,
): CustomerRelationshipProfile | null {
  const customer = state.customers.find((entry) => entry.id === customerId);
  if (!customer) return null;

  const metrics = getCustomerMetrics(state, customer.id);
  const attention = getCustomerAttentionReasons(state, customer.id);

  return {
    customer,
    metrics,
    attention,
    segments: getCustomerSegments(metrics, attention),
    timeline: getCustomerTimeline(state, customer.id),
    products: getCustomerProductRelationships(state, customer),
    deliveryHistory: getCustomerDeliveryHistory(state, customer.id),
  };
}

export function getCustomerRelationshipProfiles(
  state: ControlRoomState,
): CustomerRelationshipProfile[] {
  return state.customers.map((customer) => {
    const profile = getCustomerRelationshipProfile(state, customer.id);
    if (!profile) {
      throw new Error(`Customer ${customer.id} could not be resolved.`);
    }
    return profile;
  });
}
