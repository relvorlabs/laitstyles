import type { ApiPaginationMeta } from "@/lib/http/contracts";
import type { AdminProduct, CatalogueChannel, InventoryMode } from "@/modules/products/types";

export type InventoryCounts = {
  totalReceived: number;
  available: number;
  reserved: number;
  sold: number;
  returned: number;
  damaged: number;
};

export type StockMovementKind =
  | "received"
  | "reserved"
  | "released"
  | "sold"
  | "returned"
  | "restocked"
  | "damaged"
  | "adjusted";

export type StockMovement = {
  id: string;
  productId: string;
  variantId: string | null;
  kind: StockMovementKind;
  quantity: number;
  occurredAt: string;
  actor: string;
  note: string;
};

export type InventorySavedView =
  | "all"
  | "live"
  | "drafts"
  | "intake"
  | "low-stock"
  | "out-of-stock"
  | "held"
  | "sold"
  | "unpublished"
  | "needs-attention";

export type InventoryModeFilter = "all" | InventoryMode;
export type InventoryStockFilter =
  | "all"
  | "healthy"
  | "low-stock"
  | "out-of-stock"
  | "held"
  | "sold";
export type InventorySortKey =
  | "updated-desc"
  | "stock-asc"
  | "stock-desc"
  | "sold-desc"
  | "price-asc"
  | "price-desc"
  | "name-asc";

export type InventoryProductListInput = {
  view: InventorySavedView;
  q: string;
  mode: InventoryModeFilter;
  stock: InventoryStockFilter;
  category: string;
  collection: string;
  channel: CatalogueChannel | "all";
  sort: InventorySortKey;
  page: number;
  pageSize: number;
};

export type InventorySummary = {
  totalProducts: number;
  liveProducts: number;
  availableUnits: number;
  reservedUnits: number;
  soldUnits: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  intakeProducts: number;
};

export type InventoryViewCounts = Record<InventorySavedView, number>;

export type InventoryProductPage = {
  products: AdminProduct[];
  pagination: ApiPaginationMeta;
  summary: InventorySummary;
  viewCounts: InventoryViewCounts;
};

export type InventoryProductPageIds = Omit<InventoryProductPage, "products"> & {
  productIds: string[];
};
