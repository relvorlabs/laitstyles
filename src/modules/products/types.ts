import type {
  ProductEditorActionError,
  ProductEditorActionSuccess,
  ProductEditorIntent,
  ProductEditorIssue,
  ProductEditorValues,
} from "@/lib/admin/product-editor/product-editor-types";
import type { InventoryCounts } from "@/modules/inventory/types";

export type InventoryMode = "unique" | "stocked" | "variant";
export type ProductLifecycle = "intake" | "draft" | "active" | "archived";
export type PublicationState = "unpublished" | "scheduled" | "published";
export type CatalogueChannel = "storefront" | "physical-store" | "whatsapp" | "instagram";
export type ProductMediaKind = "cover" | "detail" | "defect";

export type ProductMedia = {
  id: string;
  url: string;
  provider?: "cloudinary" | "external";
  storageKey?: string;
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
  collection?: string | null;
  brand: string;
  material?: string | null;
  fit?: string | null;
  style?: string | null;
  careInstructions?: string | null;
  flawNotes?: string | null;
  image: string;
  media: ProductMedia[];
  price: number;
  referencePrice?: number | null;
  cost?: number | null;
  lifecycle: ProductLifecycle;
  publication: PublicationState;
  channels: CatalogueChannel[];
  lowStockThreshold: number;
  fulfilment: ProductFulfilment;
  scheduledAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type UniqueProduct = ProductBase & {
  inventoryMode: "unique";
  archiveNumber: string;
  condition: string;
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
  size?: string | null;
  colour?: string | null;
  imageUrl?: string | null;
  price?: number | null;
  cost?: number | null;
  stock: InventoryCounts;
};

export type VariantProduct = ProductBase & {
  inventoryMode: "variant";
  optionNames: string[];
  variants: ProductVariant[];
};

export type AdminProduct = UniqueProduct | StockedProduct | VariantProduct;

export type ProductReview = {
  id: string;
  productId: string;
  customerId: string;
  customerName: string;
  rating: number;
  body: string;
  createdAt: string;
};

export type ProductTaxonomyKind = "category" | "collection";

export type ProductTaxonomyItem = {
  id: string;
  kind: ProductTaxonomyKind;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
};

export type ProductTaxonomyInput = {
  kind: ProductTaxonomyKind;
  name: string;
};

export type ProductMutationInput = {
  values: ProductEditorValues;
  intent: ProductEditorIntent;
};

export type ProductMutationSuccess = ProductEditorActionSuccess;
export type ProductMutationError = ProductEditorActionError;
export type ProductMutationIssue = ProductEditorIssue;

export type ProductLifecycleSuccess = {
  productId: string;
  deleted: boolean;
  message: string;
};

export type ProductLifecycleError = {
  code: "product-not-found" | "product-in-use";
  message: string;
  productId: string;
};

export type ProductTaxonomySuccess = {
  item?: ProductTaxonomyItem;
  deletedId?: string;
  message: string;
};

export type ProductTaxonomyError = {
  code: "empty-name" | "duplicate-name" | "taxonomy-not-found" | "taxonomy-in-use";
  message: string;
  taxonomyId?: string;
};

export type ProductSaveOutcome = ProductMutationSuccess & {
  previousSlug: string | null;
};

export type ProductLifecycleOutcome = ProductLifecycleSuccess & {
  slug: string;
};

export type ProductTaxonomyOutcome = ProductTaxonomySuccess & {
  affectedProductSlugs: string[];
};
