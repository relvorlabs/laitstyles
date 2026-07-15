import type {
  CatalogueChannel,
  InventoryMode,
  InventoryProduct,
  ProductMediaKind,
} from "@/lib/admin/inventory-types";

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
  url: string;
  alt: string;
  kind: ProductMediaKind;
  position: number;
  source: "existing" | "local-preview" | "url";
};

export type ProductEditorVariant = {
  id: string;
  label: string;
  sku: string;
  size: string;
  colour: string;
  imageUrl: string;
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
    condition: "Excellent" | "Good" | "Fair";
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
  product: InventoryProduct;
  intent: ProductEditorIntent;
  message: string;
};

export type IntakeTransitionSuccess = {
  record: IntakeRecord;
  product: InventoryProduct;
  message: string;
};
