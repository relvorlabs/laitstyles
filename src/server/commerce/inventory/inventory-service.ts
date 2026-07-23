import "server-only";

export {
  saveInventoryProduct,
  type ProductSaveOutcome,
} from "@/server/commerce/inventory/inventory-product-service";
export {
  archiveInventoryProduct,
  deleteInventoryProduct,
  restoreInventoryProduct,
  type LifecycleOutcome,
} from "@/server/commerce/inventory/inventory-lifecycle-service";
export {
  createInventoryTaxonomy,
  deleteInventoryTaxonomy,
  renameInventoryTaxonomy,
  type TaxonomyOutcome,
} from "@/server/commerce/inventory/inventory-taxonomy-service";
