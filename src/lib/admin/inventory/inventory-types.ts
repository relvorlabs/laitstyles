import type {
  InventoryCounts,
  InventoryModeFilter,
  InventorySavedView,
  InventorySortKey,
  InventoryStockFilter,
} from "@/modules/inventory/types";
import type { AdminProduct, CatalogueChannel, ProductMedia } from "@/modules/products/types";

export type {
  InventoryCounts,
  InventoryModeFilter,
  InventorySavedView,
  InventorySortKey,
  InventoryStockFilter,
  InventorySummary,
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
