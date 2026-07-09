export type CurrencyCode = "NGN";

export type InventoryCounts = {
  totalReceived: number;
  available: number;
  reserved: number;
  sold: number;
  returned: number;
  damaged: number;
};

export type ProductLifecycle = "draft" | "intake" | "active" | "archived";
export type PublicationState = "published" | "unpublished" | "scheduled";

export type ProductBase = {
  id: string;
  name: string;
  category: string;
  collection?: string;
  brand?: string;
  image: string;
  price: number;
  cost?: number;
  lifecycle: ProductLifecycle;
  publication: PublicationState;
  lowStockThreshold: number;
  updatedAt: string;
};

export type UniqueProduct = ProductBase & {
  inventoryMode: "unique";
  archiveNumber: string;
  condition: "Excellent" | "Good" | "Fair";
  size: string;
  stock: InventoryCounts;
};

export type StockedProduct = ProductBase & {
  inventoryMode: "stocked";
  sku: string;
  stock: InventoryCounts;
};

export type ProductVariant = {
  id: string;
  label: string;
  sku: string;
  size?: string;
  colour?: string;
  stock: InventoryCounts;
};

export type VariantProduct = ProductBase & {
  inventoryMode: "variant";
  variants: ProductVariant[];
};

export type InventoryProduct = UniqueProduct | StockedProduct | VariantProduct;

export type SalesChannel =
  | "online"
  | "physical-store"
  | "whatsapp"
  | "instagram"
  | "phone"
  | "pop-up"
  | "staff-assisted";

export type PaymentStatus = "pending" | "paid" | "deposit" | "failed" | "refunded";

export type FulfilmentStatus =
  | "pending-payment"
  | "payment-confirmed"
  | "preparing"
  | "packed"
  | "ready-for-pickup"
  | "dispatched"
  | "out-for-delivery"
  | "delivered"
  | "cancelled"
  | "returned";

export type OrderLine = {
  id: string;
  productId: string;
  variantId?: string;
  quantity: number;
  unitPrice: number;
};

export type ControlRoomOrder = {
  id: string;
  customerId: string;
  channel: SalesChannel;
  paymentStatus: PaymentStatus;
  fulfilmentStatus: FulfilmentStatus;
  lines: OrderLine[];
  total: number;
  placedAt: string;
  deliveryCity: string;
  attention?: "payment" | "delivery" | "packing";
};

export type HoldStage = "product" | "cart" | "checkout" | "payment";

export type ControlRoomHold = {
  id: string;
  customerId?: string;
  customerLabel: string;
  productId: string;
  variantId?: string;
  quantity: number;
  stage: HoldStage;
  source: "storefront" | "admin";
  startedAt: string;
  expiresAt: string;
};

export type ControlRoomCustomer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
};

export type ActivityKind =
  | "order"
  | "hold"
  | "inventory"
  | "delivery"
  | "customer"
  | "draft";

export type ControlRoomActivity = {
  id: string;
  kind: ActivityKind;
  title: string;
  detail: string;
  occurredAt: string;
  productId?: string;
  orderId?: string;
  customerId?: string;
};

export type SalesPulsePoint = {
  date: string;
  label: string;
  online: number;
  offline: number;
};

export type ContinueTask = {
  id: string;
  type: "draft" | "order" | "setup";
  title: string;
  detail: string;
  href: string;
  progress: number;
};

export type ControlRoomState = {
  storeName: string;
  reportingDate: string;
  asOf: string;
  currency: CurrencyCode;
  isNewStore: boolean;
  products: InventoryProduct[];
  orders: ControlRoomOrder[];
  holds: ControlRoomHold[];
  customers: ControlRoomCustomer[];
  activities: ControlRoomActivity[];
  salesPulse: SalesPulsePoint[];
  continueTasks: ContinueTask[];
};

export type AttentionTone = "critical" | "warning" | "info";

export type AttentionItem = {
  id: string;
  tone: AttentionTone;
  eyebrow: string;
  title: string;
  detail: string;
  href: string;
};

export type FulfilmentLaneItem = {
  status: Extract<
    FulfilmentStatus,
    "payment-confirmed" | "preparing" | "packed" | "dispatched"
  >;
  label: string;
  count: number;
};

export type OverviewSnapshot = {
  revenue: {
    total: number;
    online: number;
    offline: number;
  };
  ordersToday: number;
  unitsSoldToday: number;
  activeHolds: number;
  attention: AttentionItem[];
  fulfilment: FulfilmentLaneItem[];
  lowStockProducts: InventoryProduct[];
  unpublishedProducts: InventoryProduct[];
  recentActivities: ControlRoomActivity[];
  continueTask?: ContinueTask;
};
