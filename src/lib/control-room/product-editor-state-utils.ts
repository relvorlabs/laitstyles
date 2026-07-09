import type { InventoryProduct } from "@/lib/control-room/inventory-types";

export function replaceOrAppendProduct(
  products: InventoryProduct[],
  product: InventoryProduct,
) {
  const index = products.findIndex((item) => item.id === product.id);
  if (index < 0) return [product, ...products];

  return products.map((item) => (item.id === product.id ? product : item));
}

export function getProductReferences(product: InventoryProduct) {
  if (product.inventoryMode === "unique") return [product.archiveNumber];
  if (product.inventoryMode === "stocked") return [product.sku];
  return product.variants.map((variant) => variant.sku);
}

export function normalizeProductReference(reference: string) {
  return reference.trim().toLocaleUpperCase("en-NG");
}
