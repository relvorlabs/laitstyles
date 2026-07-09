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
export type InventoryMode = "unique" | "stocked" | "variant";

export type CatalogueChannel =
  | "storefront"
  | "physical-store"
  | "whatsapp"
  | "instagram";

export type ProductMediaKind = "cover" | "detail" | "defect";

export type ProductMedia = {
  id: string;
  url: string;
  alt: string;
  kind: ProductMediaKind;
  position: number;
};

export type ProductMeasurement = {
  label: string;
  value: string;
};

export type ProductFulfilment = {
  weightKg: number | null;
  pickupAvailable: boolean;
  deliveryRestrictions: string;
  packagingNotes: string;
};

export type ProductBase = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  collection: string | null;
  brand: string;
  image: string;
  media: ProductMedia[];
  price: number;
  referencePrice: number | null;
  cost: number;
  lifecycle: ProductLifecycle;
  publication: PublicationState;
  channels: CatalogueChannel[];
  lowStockThreshold: number;
  fulfilment?: ProductFulfilment;
  createdAt: string;
  updatedAt: string;
};

export type UniqueProduct = ProductBase & {
  inventoryMode: "unique";
  archiveNumber: string;
  condition: "Excellent" | "Good" | "Fair";
  size: string;
  colour: string;
  measurements: ProductMeasurement[];
  stock: InventoryCounts;
};

export type StockedProduct = ProductBase & {
  inventoryMode: "stocked";
  sku: string;
  sizeLabel: string;
  colour: string;
  stock: InventoryCounts;
};

export type ProductVariant = {
  id: string;
  label: string;
  sku: string;
  size: string | null;
  colour: string | null;
  imageUrl: string | null;
  price: number | null;
  cost: number | null;
  stock: InventoryCounts;
};

export type VariantProduct = ProductBase & {
  inventoryMode: "variant";
  optionNames: string[];
  variants: ProductVariant[];
};

export type InventoryProduct = UniqueProduct | StockedProduct | VariantProduct;

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

export type ProductReview = {
  id: string;
  productId: string;
  customerId: string | null;
  rating: 1 | 2 | 3 | 4 | 5;
  title: string;
  body: string;
  status: "published" | "pending";
  createdAt: string;
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
  product: InventoryProduct;
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
