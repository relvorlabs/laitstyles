import { getCustomerHolds, getCustomerOrders } from "@/lib/admin/customers/customer-metrics";
import { getPaidOrders } from "@/lib/admin/orders/sales-selectors";
import type {
  ControlRoomCustomer,
  ControlRoomState,
  CustomerDeliveryHistoryItem,
  CustomerProductRelationship,
} from "@/lib/admin/shared/types";

export function getCustomerProductRelationships(
  state: ControlRoomState,
  customer: ControlRoomCustomer,
): CustomerProductRelationship[] {
  const relationships = new Map<string, CustomerProductRelationship>();

  function touch(productId: string, occurredAt: string) {
    const existing = relationships.get(productId);
    if (!existing) {
      const product = state.products.find((entry) => entry.id === productId);
      if (!product) {
        throw new Error(`Product ${productId} could not be resolved for customer ${customer.id}.`);
      }
      const coverImage = product.media.find((media) => media.kind === "cover") ?? product.media[0];
      const relationship: CustomerProductRelationship = {
        productId,
        productName: product.name,
        category: product.category,
        inventoryMode: product.inventoryMode,
        image: coverImage?.url ?? product.image,
        imageAlt: coverImage?.alt ?? `${product.name} product image`,
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
    touch(hold.productId, hold.releasedAt ?? hold.startedAt).heldQuantity += hold.quantity;
  }

  for (const productId of customer.savedProductIds ?? []) {
    touch(productId, customer.createdAt ?? state.asOf).saved = true;
  }

  for (const review of state.reviews) {
    if (review.customerId !== customer.id) continue;
    touch(review.productId, review.createdAt).reviewed = true;
  }

  return [...relationships.values()].toSorted(
    (left, right) => Date.parse(right.lastInteractionAt) - Date.parse(left.lastInteractionAt),
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
    .toSorted((left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt));
}
