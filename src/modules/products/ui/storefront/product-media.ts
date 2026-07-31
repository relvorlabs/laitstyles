import type { StorefrontCatalogueProduct } from "@/modules/products/storefront/catalogue-contract";

export function getProductDefaultImage(
  product: Pick<StorefrontCatalogueProduct, "defaultImage" | "images"> | null | undefined,
): string | null {
  return product?.defaultImage ?? product?.images.find(Boolean) ?? null;
}
