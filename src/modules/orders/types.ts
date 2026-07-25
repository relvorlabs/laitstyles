import type { ApiPaginationMeta } from "@/lib/http/contracts";

export type CurrencyCode = "NGN";

export type SalesChannel =
  | "online"
  | "physical-store"
  | "whatsapp"
  | "instagram"
  | "phone"
  | "pop-up"
  | "staff-assisted"
  | "other";

export type InPersonSalesChannel = Extract<
  SalesChannel,
  "physical-store" | "pop-up" | "staff-assisted"
>;

export type PaymentStatus = "pending" | "paid" | "deposit" | "failed" | "refunded";

export type PaymentMethod =
  | "cash"
  | "bank-transfer"
  | "card"
  | "pos"
  | "pay-on-delivery"
  | "other";

export type OrderStatus =
  | "pending-payment"
  | "payment-confirmed"
  | "preparing"
  | "packed"
  | "ready-for-pickup"
  | "dispatched"
  | "out-for-delivery"
  | "delivered"
  | "cancelled"
  | "refunded"
  | "returned";

export type FulfilmentStatus = OrderStatus;
export type OrderSource = "online-order" | "offline-sale" | "hold-conversion";
export type OrderLineStockState =
  | "uncommitted"
  | "reserved"
  | "committed"
  | "sold"
  | "returned"
  | "released";

export type AdminOrderCustomer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
};

export type OrderLine = {
  id: string;
  productId: string;
  variantId?: string;
  quantity: number;
  unitPrice: number;
  stockState?: OrderLineStockState;
  productName: string;
  productCategory: string;
  variantLabel?: string;
  sku?: string;
};

export type OrderTimelineEvent = {
  id: string;
  status: OrderStatus;
  occurredAt: string;
  actor: string;
  note: string;
};

export type OrderPaymentEvent = {
  id: string;
  status: PaymentStatus;
  method: PaymentMethod | null;
  amount: number;
  occurredAt: string;
  note: string;
};

export type DeliveryAddress = {
  line1: string;
  line2: string;
  city: string;
  state: string;
  country: "Nigeria";
};

export type OrderCourierBoundary = {
  name: string;
  trackingCode: string;
  statusLabel: string;
};

export type ControlRoomOrder = {
  id: string;
  databaseId: string;
  customerId: string | null;
  customerLabel?: string;
  customer: AdminOrderCustomer | null;
  source?: OrderSource;
  channel: SalesChannel;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod | null;
  fulfilmentStatus: OrderStatus;
  lines: OrderLine[];
  total: number;
  refundedAmount?: number;
  placedAt: string;
  deliveryCity: string;
  deliveryAddress?: DeliveryAddress | null;
  courier?: OrderCourierBoundary | null;
  notes?: string;
  timeline?: OrderTimelineEvent[];
  payments?: OrderPaymentEvent[];
  attention?: "payment" | "delivery" | "packing" | "return";
};

export type OrderSavedView =
  | "all"
  | "needs-attention"
  | "pending-payment"
  | "fulfilment"
  | "delivered"
  | "closed";
export type OrderChannelFilter = "all" | "online" | "offline";
export type OrderPaymentFilter = PaymentStatus | "all";
export type OrderSortKey = "placed-desc" | "placed-asc" | "total-desc" | "total-asc";

export type OrderListInput = {
  view: OrderSavedView;
  search: string;
  channel: OrderChannelFilter;
  payment: OrderPaymentFilter;
  sort: OrderSortKey;
  page: number;
  pageSize: number;
};

export type OrderSavedViewCounts = Record<OrderSavedView, number>;

export type OrderWorkspaceSummary = {
  totalOrders: number;
  needsAttention: number;
  pendingPayment: number;
  inFulfilment: number;
  delivered: number;
  netRevenue: number;
};

export type AdminOrderListResult = {
  data: ControlRoomOrder[];
  meta: ApiPaginationMeta & {
    counts: OrderSavedViewCounts;
    summary: OrderWorkspaceSummary;
  };
};

export type ExistingSaleCustomer = { kind: "existing"; customerId: string };
export type NewSaleCustomer = {
  kind: "new";
  name: string;
  email: string;
  phone: string;
  city: string;
};
export type OfflineSaleCustomer = ExistingSaleCustomer | NewSaleCustomer;

export type OfflineSaleLineInput = {
  productId: string;
  variantId?: string;
  quantity: number;
  unitPrice: number;
};

export type OfflineSaleInput = {
  lines: OfflineSaleLineInput[];
  channel: InPersonSalesChannel;
  customer: OfflineSaleCustomer;
  notes: string;
};

export type OfflineSaleCheckout = {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
};

export type SalesActionErrorCode =
  | "invalid-quantity"
  | "invalid-price"
  | "empty-sale"
  | "product-not-found"
  | "variant-required"
  | "variant-not-found"
  | "variant-not-allowed"
  | "insufficient-available-stock"
  | "insufficient-reserved-stock"
  | "insufficient-committed-stock"
  | "order-not-found"
  | "invalid-order-transition"
  | "customer-not-found"
  | "customer-email-required"
  | "invalid-payment-state"
  | "paystack-not-configured"
  | "paystack-initialization-failed";

export type SalesActionError = {
  code: SalesActionErrorCode;
  message: string;
  field?: string;
  productId?: string;
  variantId?: string;
  orderId?: string;
  available?: number;
  requested?: number;
  conflictingHoldIds?: string[];
};

export type OrderTransitionInput = { nextStatus: OrderStatus };
export type OrderTransitionSuccess = { order: ControlRoomOrder; message: string };
export type OfflineSaleSuccess = {
  order: ControlRoomOrder;
  customerId: string;
  checkout: OfflineSaleCheckout;
  message: string;
};
