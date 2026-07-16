import {
  getCustomerAttentionReasons,
  getCustomerMetrics,
  getCustomerSegments,
} from "@/lib/admin/customers/customer-metrics";
import {
  getCustomerDeliveryHistory,
  getCustomerProductRelationships,
} from "@/lib/admin/customers/customer-products";
import { getCustomerTimeline } from "@/lib/admin/customers/customer-timeline";
import type { ControlRoomState, CustomerRelationshipProfile } from "@/lib/admin/types";

export {
  getCustomerAttentionReasons,
  getCustomerHolds,
  getCustomerMetrics,
  getCustomerOrders,
  getCustomerReturns,
  getCustomerSegments,
} from "@/lib/admin/customers/customer-metrics";
export {
  getCustomerDeliveryHistory,
  getCustomerProductRelationships,
} from "@/lib/admin/customers/customer-products";
export { getCustomerTimeline } from "@/lib/admin/customers/customer-timeline";

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
