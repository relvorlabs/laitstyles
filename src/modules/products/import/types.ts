import type { Result } from "@/lib/errors";
import type { ProductEditorIssue, ProductEditorValues } from "@/modules/products/types";

export const PRODUCT_IMPORT_MAX_BYTES = 10 * 1024 * 1024;
export const PRODUCT_IMPORT_MAX_ROWS = 1_000;

export type ProductImportSource = "csv" | "json";

export type ProductImportMeasurement = {
  label: string;
  value: string;
};

export type ProductImportVariant = {
  label: string;
  sku?: string;
  size?: string;
  colour?: string;
  price?: number;
  cost?: number;
  stock: number;
};

type ProductImportBase = {
  name: string;
  description?: string;
  category?: string;
  collection?: string;
  brand?: string;
  material?: string;
  fit?: string;
  style?: string;
  careInstructions?: string;
  flawNotes?: string;
  internalReference?: string;
  sellingPrice?: number;
  referencePrice?: number;
  cost?: number;
  lowStockThreshold?: number;
  channels?: string[];
  fulfilment?: {
    weightKg?: number | null;
    pickupAvailable?: boolean;
    deliveryRestrictions?: string;
    packagingNotes?: string;
  };
  scheduledAt?: string;
};

export type UniqueProductImportRow = ProductImportBase & {
  mode: "unique";
  condition?: string;
  size?: string;
  colour?: string;
  measurements: ProductImportMeasurement[];
};

export type StockedProductImportRow = ProductImportBase & {
  mode: "stocked";
  sizeLabel?: string;
  colour?: string;
  stock: number;
};

export type VariantProductImportRow = ProductImportBase & {
  mode: "variant";
  optionNames?: string[];
  variants: ProductImportVariant[];
  measurements: ProductImportMeasurement[];
};

export type ProductImportRow =
  | UniqueProductImportRow
  | StockedProductImportRow
  | VariantProductImportRow;

export type ProductImportFileIssue = {
  code:
    | "file-too-large"
    | "too-many-products"
    | "unsupported-file-type"
    | "invalid-json"
    | "invalid-import"
    | "invalid-json-cell"
    | "malformed-csv";
  message: string;
  row?: number;
  column?: number;
};

export type ProductImportParseResult = Result<
  { source: ProductImportSource; rows: ProductImportRow[] },
  ProductImportFileIssue
>;

export type ProductImportFileInput = {
  fileName: string;
  size: number;
  text: string;
};

export type ProductImportChildStatus = "ready" | "saving" | "saved" | "failed";

export type ProductImportChild = {
  importId: string;
  values: ProductEditorValues;
  issues: ProductEditorIssue[];
  status: ProductImportChildStatus;
};

export type ProductImportSessionState = {
  source: ProductImportSource;
  children: ProductImportChild[];
  selectedImportId: string | null;
  ignoredAssetCount: number;
};
