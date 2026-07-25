import type { ApiPaginationMeta } from "@/lib/http/contracts";
import type { ControlRoomOrder } from "@/modules/orders/types";

export type HoldStage = "product" | "cart" | "checkout" | "payment";
export type HoldStatus = "active" | "released" | "converted" | "expired" | "cancelled";
export type HoldSource = "storefront" | "admin" | "whatsapp" | "instagram" | "physical-store";
export type HoldPaymentProgress =
  | "not-started"
  | "initialized"
  | "pending"
  | "successful"
  | "failed";
export type HoldRisk =
  | "stable"
  | "expiring"
  | "payment-risk"
  | "expired"
  | "released"
  | "converted";

export type HoldCustomer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
};

export type HoldProduct = {
  name: string;
  variantLabel: string | null;
  reference: string;
  imageUrl: string;
  imageAlt: string;
};

export type ControlRoomHold = {
  id: string;
  customerId: string;
  customerLabel: string;
  customer: HoldCustomer;
  productId: string;
  variantId?: string;
  product: HoldProduct;
  orderId?: string;
  convertedOrderId?: string;
  quantity: number;
  stage: HoldStage;
  source: HoldSource;
  paymentProgress: HoldPaymentProgress;
  status: HoldStatus;
  risk: HoldRisk;
  secondsRemaining: number;
  startedAt: string;
  expiresAt: string;
  releasedAt?: string;
  convertedAt?: string;
  note?: string;
};

export type HoldSavedView = "all" | "active" | "expiring" | "payment-risk" | "expired";
export type HoldSourceFilter = "all" | "storefront" | "assisted";
export type HoldStageFilter = HoldStage | "all";
export type HoldSortKey = "expiry-asc" | "expiry-desc" | "started-desc" | "quantity-desc";

export type HoldListInput = {
  view: HoldSavedView;
  search: string;
  source: HoldSourceFilter;
  stage: HoldStageFilter;
  sort: HoldSortKey;
  page: number;
  pageSize: number;
};

export type HoldSavedViewCounts = Record<HoldSavedView, number>;
export type HoldWorkspaceSummary = {
  totalHolds: number;
  activeHolds: number;
  expiringHolds: number;
  paymentRisk: number;
  expiredHolds: number;
  reservedUnits: number;
};

export type AdminHoldListResult = {
  data: ControlRoomHold[];
  meta: ApiPaginationMeta & {
    counts: HoldSavedViewCounts;
    summary: HoldWorkspaceSummary;
  };
};

export type ExtendHoldInput = { minutes: number };
export type ConvertHoldInput = {
  deliveryCity: string;
  notes: string;
};

export type HoldActionErrorCode =
  | "hold-not-found"
  | "hold-inactive"
  | "invalid-hold-extension"
  | "stock-write-conflict"
  | "insufficient-reserved-stock";

export type HoldActionError = {
  code: HoldActionErrorCode;
  message: string;
  holdId?: string;
  available?: number;
  requested?: number;
};

export type HoldActionSuccess = {
  hold: ControlRoomHold;
  order?: ControlRoomOrder;
  message: string;
};
