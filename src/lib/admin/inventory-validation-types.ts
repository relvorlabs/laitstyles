import type { InventoryProduct, ProductReview, StockMovement } from "@/lib/admin/inventory-types";

export type InventoryValidationIssue = {
  path: string;
  code:
    | "negative-count"
    | "non-integer-count"
    | "stock-total-mismatch"
    | "unique-quantity"
    | "missing-cover"
    | "multiple-covers"
    | "empty-variants"
    | "duplicate-variant-id"
    | "duplicate-variant-sku"
    | "invalid-threshold"
    | "duplicate-product-id"
    | "duplicate-slug"
    | "duplicate-reference"
    | "orphan-stock-movement"
    | "orphan-stock-movement-variant"
    | "invalid-stock-movement-quantity"
    | "orphan-review";
  message: string;
};

export type InventoryDataset = {
  products: InventoryProduct[];
  stockMovements: StockMovement[];
  reviews: ProductReview[];
};
