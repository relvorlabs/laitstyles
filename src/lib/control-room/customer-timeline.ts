import type {
  ControlRoomState,
  CustomerTimelineEvent,
  OrderStatus,
} from "@/lib/control-room/types";
import {
  getCustomerHolds,
  getCustomerOrders,
  getCustomerReturns,
} from "@/lib/control-room/customer-metrics";

const deliveryStatuses = new Set<OrderStatus>([
  "dispatched",
  "out-for-delivery",
  "delivered",
]);

export function getCustomerTimeline(
  state: ControlRoomState,
  customerId: string,
): CustomerTimelineEvent[] {
  const events: CustomerTimelineEvent[] = [];

  for (const order of getCustomerOrders(state, customerId)) {
    const unitCount = order.lines.reduce(
      (total, line) => total + line.quantity,
      0,
    );
    events.push({
      id: `customer-order-${order.id}`,
      kind: "order",
      occurredAt: order.placedAt,
      title:
        order.source === "offline-sale"
          ? `Offline sale ${order.id}`
          : `Order ${order.id} placed`,
      detail: `${unitCount} unit${unitCount === 1 ? "" : "s"} · ${order.channel.replaceAll("-", " ")} · ${order.paymentStatus.replaceAll("-", " ")}`,
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

    if (hold.convertedOrderId) {
      events.push({
        id: `customer-hold-conversion-${hold.id}`,
        kind: "hold",
        occurredAt: hold.releasedAt ?? state.asOf,
        title: "Hold converted to order",
        detail: `Created ${hold.convertedOrderId}.`,
        productId: hold.productId,
        holdId: hold.id,
        orderId: hold.convertedOrderId,
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
