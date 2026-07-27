import type { InventoryCounts } from "@/modules/inventory/types";

export type InventoryMode = "unique" | "stocked" | "variant";
export type ProductLifecycle = "intake" | "draft" | "active" | "archived";
export type PublicationState = "unpublished" | "scheduled" | "published";
export type CatalogueChannel = "storefront" | "physical-store" | "whatsapp" | "instagram";
export type ProductMediaKind = "cover" | "detail" | "defect";

export type ProductMedia = {
  id: string;
  publicId: string;
  url: string;
  width: number | null;
  height: number | null;
  format: string | null;
  bytes: number | null;
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
  material?: string | null;
  fit?: string | null;
  style?: string | null;
  careInstructions?: string | null;
  flawNotes?: string | null;
  image: string;
  media: ProductMedia[];
  price: number;
  referencePrice: number | null;
  cost: number | null;
  lifecycle: ProductLifecycle;
  publication: PublicationState;
  channels: CatalogueChannel[];
  lowStockThreshold: number;
  fulfilment?: ProductFulfilment;
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

export type ProductVariantImage = {
  publicId: string;
  url: string;
  width: number | null;
  height: number | null;
  format: string | null;
  bytes: number | null;
};

export type ProductVariant = {
  id: string;
  label: string;
  sku: string;
  size: string | null;
  colour: string | null;
  image: ProductVariantImage | null;
  price: number | null;
  cost: number | null;
  stock: InventoryCounts;
};

export type VariantProduct = ProductBase & {
  inventoryMode: "variant";
  optionNames: string[];
  variants: ProductVariant[];
};

export type AdminProduct = UniqueProduct | StockedProduct | VariantProduct;

export const productEditorSteps = [
  "type",
  "identity",
  "images",
  "stock",
  "pricing",
  "fulfilment",
  "review",
] as const;

export type ProductEditorStep = (typeof productEditorSteps)[number];

export type ProductEditorMeasurement = {
  id: string;
  label: string;
  value: string;
};

export type ProductEditorMedia = {
  id: string;
  publicId: string;
  url: string;
  width: number | null;
  height: number | null;
  format: string | null;
  bytes: number | null;
  alt: string;
  kind: ProductMediaKind;
  position: number;
  source: "existing" | "upload";
};

export type ProductEditorVariant = {
  id: string;
  label: string;
  sku: string;
  size: string;
  colour: string;
  image: ProductVariantImage | null;
  price: number | null;
  cost: number | null;
  quantity: number;
};

export type ProductEditorFulfilment = {
  weightKg: number | null;
  pickupAvailable: boolean;
  deliveryRestrictions: string;
  packagingNotes: string;
};

export type ProductEditorBase = {
  productId: string | null;
  inventoryMode: InventoryMode;
  name: string;
  category: string;
  brand: string;
  material: string;
  fit: string;
  style: string;
  careInstructions: string;
  flawNotes: string;
  description: string;
  collection: string;
  internalReference: string;
  media: ProductEditorMedia[];
  sellingPrice: number | null;
  referencePrice: number | null;
  cost: number | null;
  lowStockThreshold: number;
  channels: CatalogueChannel[];
  fulfilment: ProductEditorFulfilment;
  scheduledAt: string;
};

export type UniqueProductEditorValues = ProductEditorBase & {
  inventoryMode: "unique";
  unique: {
    condition: string;
    size: string;
    colour: string;
    measurements: ProductEditorMeasurement[];
  };
};

export type StockedProductEditorValues = ProductEditorBase & {
  inventoryMode: "stocked";
  stocked: {
    sizeLabel: string;
    colour: string;
    quantity: number;
  };
};

export type VariantProductEditorValues = ProductEditorBase & {
  inventoryMode: "variant";
  variant: {
    optionNames: string[];
    variants: ProductEditorVariant[];
  };
};

export type ProductEditorValues =
  | UniqueProductEditorValues
  | StockedProductEditorValues
  | VariantProductEditorValues;

export type ProductEditorIntent = "draft" | "publish" | "schedule";

export type IntakeStage =
  | "received"
  | "photographing"
  | "details-required"
  | "pricing-review"
  | "ready-to-publish"
  | "published";

export type IntakeRecord = {
  id: string;
  productId: string;
  stage: IntakeStage;
  receivedAt: string;
  updatedAt: string;
  assignedTo: string;
  note: string;
};

export type ProductEditorIssue = {
  path: string;
  message: string;
  step: ProductEditorStep;
};

export type ProductEditorActionError = {
  code:
    | "validation-failed"
    | "duplicate-reference"
    | "product-not-found"
    | "intake-not-found"
    | "invalid-intake-transition";
  message: string;
  issues?: ProductEditorIssue[];
};

export type ProductEditorActionSuccess = {
  product: AdminProduct;
  intent: ProductEditorIntent;
  message: string;
};

export type IntakeTransitionSuccess = {
  record: IntakeRecord;
  product: AdminProduct;
  message: string;
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
