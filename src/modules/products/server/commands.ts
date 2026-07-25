import "server-only";

// Stable command entrypoint for Route Handlers and server orchestration. Command
// implementations remain split by product save, lifecycle and taxonomy policy.
export { archiveProduct, deleteProduct, restoreProduct } from "@/modules/products/server/lifecycle-commands";
export { saveProduct } from "@/modules/products/server/product-commands";
export {
  createProductTaxonomy,
  deleteProductTaxonomy,
  renameProductTaxonomy,
} from "@/modules/products/server/taxonomy-commands";
