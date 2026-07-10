import type {
  ControlRoomCustomer,
  ControlRoomState,
  CustomerDeliveryHistoryItem,
  CustomerProductRelationship,
} from "@/lib/control-room/types";
import {
  getCustomerHolds,
  getCustomerOrders,
} from "@/lib/control-room/customer-metrics";
import { getPaidOrders } from "@/lib/control-room/sales-selectors";

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
