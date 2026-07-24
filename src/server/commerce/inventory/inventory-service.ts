import "server-only";

export {
  archiveInventoryProduct,
  deleteInventoryProduct,
  type LifecycleOutcome,
  restoreInventoryProduct,
} from "@/server/commerce/inventory/inventory-lifecycle-service";
export {
  type ProductSaveOutcome,
  saveInventoryProduct,
} from "@/server/commerce/inventory/inventory-product-service";
export {
  createInventoryTaxonomy,
  deleteInventoryTaxonomy,
  renameInventoryTaxonomy,
  type TaxonomyOutcome,
} from "@/server/commerce/inventory/inventory-taxonomy-service";
