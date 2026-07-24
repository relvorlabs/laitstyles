import type {
  InventoryCounts,
  StockMovement,
} from "@/modules/inventory/types";
import type {
  AdminProduct,
  CatalogueChannel,
  InventoryMode,
  ProductMedia,
} from "@/modules/products/types";

export type {
  InventoryCounts,
  StockMovement,
  StockMovementKind,
} from "@/modules/inventory/types";
export type {
  AdminProduct as InventoryProduct,
  CatalogueChannel,
  InventoryMode,
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
  UniqueProduct,
  VariantProduct,
} from "@/modules/products/types";

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

export type InventoryPresentation = "grid" | "table";

export type InventoryQuery = {
  search: string;
  view: InventorySavedView;
  mode: InventoryModeFilter;
  stock: InventoryStockFilter;
  category: string;
  collection: string;
  channel: CatalogueChannel | "all";
  sort: InventorySortKey;
};

export type InventoryHealth =
  | "healthy"
  | "low-stock"
  | "out-of-stock"
  | "held"
  | "sold"
  | "draft"
  | "intake"
  | "archived"
  | "unpublished";

export type InventoryAttentionReason =
  | "low-stock"
  | "out-of-stock"
  | "damaged-stock"
  | "returned-stock"
  | "unpublished"
  | "draft"
  | "intake";

export type InventoryListItem = {
  product: AdminProduct;
  coverImage: ProductMedia;
  reference: string;
  stock: InventoryCounts;
  health: InventoryHealth;
  attention: InventoryAttentionReason[];
  variantCount: number;
};

export type InventoryFacetOptions = {
  categories: string[];
  collections: string[];
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
