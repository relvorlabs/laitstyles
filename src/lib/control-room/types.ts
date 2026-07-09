import type {
  InventoryProduct,
  ProductReview,
  StockMovement,
} from "@/lib/control-room/inventory-types";
import type { IntakeRecord } from "@/lib/control-room/product-editor-types";

export type {
  CatalogueChannel,
  InventoryAttentionReason,
  InventoryCounts,
  InventoryFacetOptions,
  InventoryHealth,
  InventoryListItem,
  InventoryMode,
  InventoryModeFilter,
  InventoryPresentation,
  InventoryProduct,
  InventoryQuery,
  InventorySavedView,
  InventorySortKey,
  InventoryStockFilter,
  InventorySummary,
  ProductBase,
  ProductFulfilment,
  ProductLifecycle,
  ProductMeasurement,
  ProductMedia,
  ProductMediaKind,
  ProductReview,
  ProductVariant,
  PublicationState,
  StockedProduct,
  StockMovement,
  StockMovementKind,
  UniqueProduct,
  VariantProduct,
} from "@/lib/control-room/inventory-types";

export type {
  IntakeRecord,
  IntakeStage,
  IntakeTransitionSuccess,
  ProductEditorActionError,
  ProductEditorActionSuccess,
  ProductEditorBase,
  ProductEditorFulfilment,
  ProductEditorIntent,
  ProductEditorIssue,
  ProductEditorMeasurement,
  ProductEditorMedia,
  ProductEditorStep,
  ProductEditorValues,
  ProductEditorVariant,
  StockedProductEditorValues,
  UniqueProductEditorValues,
  VariantProductEditorValues,
} from "@/lib/control-room/product-editor-types";

export type CurrencyCode = "NGN";

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
  intake: IntakeRecord[];
  orders: ControlRoomOrder[];
  holds: ControlRoomHold[];
  customers: ControlRoomCustomer[];
  activities: ControlRoomActivity[];
  stockMovements: StockMovement[];
  reviews: ProductReview[];
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
