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

export type PaymentStatus = "pending" | "paid" | "deposit" | "failed" | "refunded";

export type PaymentMethod = "cash" | "bank-transfer" | "card" | "pos" | "pay-on-delivery" | "other";

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

export type OrderLineStockState = "uncommitted" | "reserved" | "sold" | "returned" | "released";

export type OrderLine = {
  id: string;
  productId: string;
  variantId?: string;
  quantity: number;
  unitPrice: number;
  stockState?: OrderLineStockState;
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
  customerId: string | null;
  customerLabel?: string;
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

export type HoldStage = "product" | "cart" | "checkout" | "payment";
export type HoldStatus = "active" | "released" | "converted" | "expired";
export type HoldSource = "storefront" | "admin" | "whatsapp" | "instagram" | "physical-store";

export type ControlRoomHold = {
  id: string;
  customerId?: string;
  customerLabel: string;
  productId: string;
  variantId?: string;
  quantity: number;
  stage: HoldStage;
  source: HoldSource;
  paymentProgress?: PaymentStatus;
  status?: HoldStatus;
  startedAt: string;
  expiresAt: string;
  releasedAt?: string;
  convertedOrderId?: string;
  note?: string;
};

export type ReturnStatus =
  | "requested"
  | "approved"
  | "received"
  | "inspecting"
  | "refunded"
  | "restocked"
  | "damaged"
  | "rejected"
  | "closed";

export type ReturnDisposition = "pending" | "restock" | "damaged";

export type ReturnLine = {
  id: string;
  orderLineId: string;
  productId: string;
  variantId?: string;
  quantity: number;
  disposition: ReturnDisposition;
};

export type ControlRoomReturn = {
  id: string;
  orderId: string;
  customerId: string | null;
  status: ReturnStatus;
  reason: string;
  requestedAt: string;
  updatedAt: string;
  lines: ReturnLine[];
  refundAmount: number;
  note: string;
};

export type ExistingSaleCustomer = {
  kind: "existing";
  customerId: string;
};

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
  channel: Exclude<SalesChannel, "online">;
  customer: OfflineSaleCustomer;
  paymentMethod: PaymentMethod;
  paymentStatus: Extract<PaymentStatus, "pending" | "paid" | "deposit">;
  notes: string;
};

export type ConvertHoldInput = {
  holdId: string;
  paymentMethod: PaymentMethod | null;
  paymentStatus: Extract<PaymentStatus, "pending" | "paid" | "deposit">;
  deliveryCity: string;
  notes: string;
};

export type CreateReturnInput = {
  orderId: string;
  reason: string;
  note: string;
  lines: Array<{
    orderLineId: string;
    quantity: number;
  }>;
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
  | "insufficient-sold-stock"
  | "insufficient-returned-stock"
  | "order-not-found"
  | "invalid-order-transition"
  | "hold-not-found"
  | "hold-inactive"
  | "invalid-hold-extension"
  | "customer-not-found"
  | "invalid-payment-state"
  | "return-not-found"
  | "return-line-not-found"
  | "return-line-not-sold"
  | "return-quantity-exceeded"
  | "invalid-return-transition";

export type SalesActionError = {
  code: SalesActionErrorCode;
  message: string;
  field?: string;
  productId?: string;
  variantId?: string;
  orderId?: string;
  holdId?: string;
  returnId?: string;
  available?: number;
  requested?: number;
  conflictingHoldIds?: string[];
};

export type OrderTransitionSuccess = {
  order: ControlRoomOrder;
  message: string;
};

export type HoldActionSuccess = {
  hold: ControlRoomHold;
  order?: ControlRoomOrder;
  message: string;
};

export type OfflineSaleSuccess = {
  order: ControlRoomOrder;
  customerId: string;
  message: string;
};

export type ReturnActionSuccess = {
  returnRecord: ControlRoomReturn;
  message: string;
};
