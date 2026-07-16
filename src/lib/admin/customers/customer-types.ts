import type { DeliveryAddress, OrderStatus } from "@/lib/admin/orders/sales-types";

export type CustomerType = "individual" | "stylist" | "reseller" | "walk-in";

export type CustomerContactPreference = "whatsapp" | "phone" | "email" | "none";

export type CustomerAddress = DeliveryAddress & {
  id: string;
  label: string;
  isDefault: boolean;
  deliveryNotes: string;
};

export type CustomerPreferences = {
  contact: CustomerContactPreference;
  sizes: string[];
  colours: string[];
  deliveryNotes: string;
};

export type CustomerNote = {
  id: string;
  body: string;
  createdAt: string;
  author: string;
};

export type ControlRoomCustomer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  type?: CustomerType;
  createdAt?: string;
  addresses?: CustomerAddress[];
  preferences?: CustomerPreferences;
  savedProductIds?: string[];
  notes?: CustomerNote[];
};

export type CustomerAttentionReason = "payment" | "delivery" | "return" | "hold";

export type CustomerSegment = "new" | "returning" | "high-value" | "needs-attention";

export type CustomerMetrics = {
  lifetimeSpend: number;
  averageOrderValue: number;
  orderCount: number;
  paidOrderCount: number;
  returnCount: number;
  cancellationCount: number;
  activeHoldCount: number;
  reviewCount: number;
  lastPurchaseAt: string | null;
};

export type CustomerTimelineKind =
  | "order"
  | "payment"
  | "delivery"
  | "hold"
  | "return"
  | "review"
  | "customer";

export type CustomerTimelineEvent = {
  id: string;
  kind: CustomerTimelineKind;
  occurredAt: string;
  title: string;
  detail: string;
  orderId?: string;
  productId?: string;
  returnId?: string;
  holdId?: string;
};

export type CustomerProductRelationship = {
  productId: string;
  purchasedQuantity: number;
  heldQuantity: number;
  saved: boolean;
  reviewed: boolean;
  lastInteractionAt: string;
};

export type CustomerDeliveryHistoryItem = {
  orderId: string;
  occurredAt: string;
  city: string;
  address: DeliveryAddress | null;
  status: OrderStatus;
};

export type CustomerRelationshipProfile = {
  customer: ControlRoomCustomer;
  metrics: CustomerMetrics;
  segments: CustomerSegment[];
  attention: CustomerAttentionReason[];
  timeline: CustomerTimelineEvent[];
  products: CustomerProductRelationship[];
  deliveryHistory: CustomerDeliveryHistoryItem[];
};

export type AddCustomerNoteInput = {
  customerId: string;
  body: string;
};

export type CustomerActionErrorCode = "customer-not-found" | "empty-note" | "note-too-long";

export type CustomerActionError = {
  code: CustomerActionErrorCode;
  message: string;
  field?: "body";
  customerId?: string;
};

export type CustomerNoteActionSuccess = {
  customerId: string;
  note: CustomerNote;
  message: string;
};
