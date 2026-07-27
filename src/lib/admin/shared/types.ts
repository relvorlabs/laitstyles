import type { ControlRoomCustomer } from "@/lib/admin/customers/customer-types";
import type { CatalogueTaxonomyItem } from "@/lib/admin/inventory/catalogue-taxonomy";
import type {
  InventoryProduct,
  ProductReview,
  StockMovement,
} from "@/lib/admin/inventory/inventory-types";
import type {
  ControlRoomHold,
  ControlRoomOrder,
  ControlRoomReturn,
  CurrencyCode,
  FulfilmentStatus,
} from "@/lib/admin/orders/sales-types";
import type { IntakeRecord } from "@/lib/admin/product-editor/product-editor-types";
import type { StoreSettings } from "@/lib/admin/settings/settings-types";

export type {
  AddCustomerNoteInput,
  ControlRoomCustomer,
  CustomerActionError,
  CustomerActionErrorCode,
  CustomerAddress,
  CustomerAttentionReason,
  CustomerContactPreference,
  CustomerDeliveryHistoryItem,
  CustomerMetrics,
  CustomerNote,
  CustomerNoteActionSuccess,
  CustomerPreferences,
  CustomerProductRelationship,
  CustomerRelationshipProfile,
  CustomerSegment,
  CustomerTimelineEvent,
  CustomerTimelineKind,
  CustomerType,
} from "@/lib/admin/customers/customer-types";
export type {
  CatalogueTaxonomyActionError,
  CatalogueTaxonomyActionSuccess,
  CatalogueTaxonomyInput,
  CatalogueTaxonomyItem,
  CatalogueTaxonomyKind,
} from "@/lib/admin/inventory/catalogue-taxonomy";

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
} from "@/lib/admin/inventory/inventory-types";
export type {
  ControlRoomHold,
  ControlRoomOrder,
  ControlRoomReturn,
  ConvertHoldInput,
  CreateReturnInput,
  CurrencyCode,
  DeliveryAddress,
  ExistingSaleCustomer,
  FulfilmentStatus,
  HoldActionSuccess,
  HoldSource,
  HoldStage,
  HoldStatus,
  NewSaleCustomer,
  OfflineSaleCustomer,
  OfflineSaleInput,
  OfflineSaleLineInput,
  OfflineSaleSuccess,
  OrderCourierBoundary,
  OrderLine,
  OrderLineStockState,
  OrderPaymentEvent,
  OrderSource,
  OrderStatus,
  OrderTimelineEvent,
  OrderTransitionSuccess,
  PaymentMethod,
  PaymentStatus,
  ReturnActionSuccess,
  ReturnDisposition,
  ReturnLine,
  ReturnStatus,
  SalesActionError,
  SalesActionErrorCode,
  SalesChannel,
} from "@/lib/admin/orders/sales-types";
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
} from "@/lib/admin/product-editor/product-editor-types";

export type {
  AcceptedPaymentMethod,
  DeliverySettings,
  DeliveryZoneSettings,
  NotificationSettings,
  PaymentSettings,
  PickupLocationSettings,
  RefundPreference,
  SaveStoreSettingsInput,
  SellingPreferencesSettings,
  SettingsSection,
  SettingsValidationIssue,
  StoreBrandLogo,
  StoreIdentitySettings,
  StoreSettings,
  StoreSettingsActionError,
  StoreSettingsActionErrorCode,
  StoreSettingsActionSuccess,
} from "@/lib/admin/settings/settings-types";

export type ActivityKind =
  | "order"
  | "hold"
  | "inventory"
  | "delivery"
  | "customer"
  | "draft"
  | "sale"
  | "return"
  | "settings";

export type AdminActivity = {
  id: string;
  kind: ActivityKind;
  title: string;
  detail: string;
  occurredAt: string;
  productId?: string;
  orderId?: string;
  customerId?: string;
};

/** @deprecated Use AdminActivity. */
export type ControlRoomActivity = AdminActivity;

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

export type AdminState = {
  storeName: string;
  reportingDate: string;
  asOf: string;
  currency: CurrencyCode;
  isNewStore: boolean;
  products: InventoryProduct[];
  catalogueTaxonomy?: CatalogueTaxonomyItem[];
  intake?: IntakeRecord[];
  orders: ControlRoomOrder[];
  holds: ControlRoomHold[];
  returns?: ControlRoomReturn[];
  customers: ControlRoomCustomer[];
  settings?: StoreSettings;
  activities: AdminActivity[];
  stockMovements: StockMovement[];
  reviews: ProductReview[];
  salesPulse: SalesPulsePoint[];
  continueTasks: ContinueTask[];
};

/** @deprecated Use AdminState. */
export type ControlRoomState = AdminState;

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
  status: Extract<FulfilmentStatus, "payment-confirmed" | "preparing" | "packed" | "dispatched">;
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
  recentActivities: AdminActivity[];
  continueTask?: ContinueTask;
};
