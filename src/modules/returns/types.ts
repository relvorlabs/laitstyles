import type { ApiPaginationMeta } from "@/lib/http/contracts";

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
export type ReturnSavedView =
  | "all"
  | "open"
  | "awaiting-item"
  | "inspection"
  | "refund"
  | "resolved";
export type ReturnSortKey = "updated-desc" | "requested-desc" | "value-desc";

export type ReturnListInput = {
  view: ReturnSavedView;
  search: string;
  status: ReturnStatus | "all";
  sort: ReturnSortKey;
  page: number;
  pageSize: number;
};

export type ReturnLine = {
  id: string;
  orderLineId: string;
  productId: string;
  variantId?: string;
  productName: string;
  variantLabel?: string;
  quantity: number;
  disposition: ReturnDisposition;
};

export type ControlRoomReturn = {
  id: string;
  databaseId: string;
  orderId: string;
  orderDatabaseId: string;
  customerId: string | null;
  customerName: string;
  status: ReturnStatus;
  reason: string;
  requestedAt: string;
  updatedAt: string;
  lines: ReturnLine[];
  refundAmount: number;
  note: string;
  orderTotal: number;
  orderPaymentStatus: string;
  currency: string;
};

export type AccountReturnLine = {
  id: string;
  orderLineId: string;
  productName: string;
  variantLabel?: string;
  quantity: number;
  disposition: ReturnDisposition;
};

export type AccountReturn = {
  id: string;
  orderNumber: string;
  status: ReturnStatus;
  reason: string;
  note: string;
  requestedAt: string;
  updatedAt: string;
  refundAmountKobo: number;
  currency: string;
  lines: AccountReturnLine[];
};

export type CreateAccountReturnInput = {
  orderNumber: string;
  reason: string;
  note?: string;
  lines: Array<{ orderLineId: string; quantity: number }>;
};

export type AccountEligibleReturnOrder = {
  orderNumber: string;
  totalKobo: number;
  lines: Array<
    Omit<EligibleReturnLine, "unitPrice"> & {
      unitPriceKobo: number;
    }
  >;
};

export type ReturnSavedViewCounts = Record<ReturnSavedView, number>;
export type ReturnWorkspaceSummary = {
  totalReturns: number;
  openReturns: number;
  awaitingItem: number;
  inspecting: number;
  refundValue: number;
};
export type AdminReturnListResult = {
  data: ControlRoomReturn[];
  meta: ApiPaginationMeta & {
    counts: ReturnSavedViewCounts;
    summary: ReturnWorkspaceSummary;
  };
};

export type EligibleReturnLine = {
  id: string;
  productId: string;
  variantId?: string;
  productName: string;
  variantLabel?: string;
  quantity: number;
  eligibleQuantity: number;
  unitPrice: number;
};
export type EligibleReturnOrder = {
  id: string;
  databaseId: string;
  customerName: string;
  total: number;
  deliveryCity: string;
  lines: EligibleReturnLine[];
};

export type CreateReturnInput = {
  orderId: string;
  reason: string;
  note: string;
  lines: Array<{ orderLineId: string; quantity: number }>;
};
export type ReturnTransitionInput = { nextStatus: ReturnStatus };
export type ReturnActionSuccess = { returnRecord: ControlRoomReturn; message: string };

export type ReturnActionErrorCode =
  | "order-not-found"
  | "return-not-found"
  | "return-line-not-found"
  | "return-line-not-sold"
  | "return-quantity-exceeded"
  | "invalid-quantity"
  | "invalid-return-transition"
  | "insufficient-sold-stock"
  | "insufficient-returned-stock"
  | "stock-write-conflict";

export type ReturnActionError = {
  code: ReturnActionErrorCode;
  message: string;
  field?: string;
  returnId?: string;
  orderId?: string;
  productId?: string;
  variantId?: string;
  available?: number;
  requested?: number;
};
