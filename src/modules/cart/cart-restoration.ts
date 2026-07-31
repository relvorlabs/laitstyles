import type { ProductVariantOption } from "@/lib/storefront/types";
import type { CartLine } from "@/modules/cart/cart-lines";
import { projectCartIntents } from "@/modules/cart/cart-projection";
import type { Product } from "@/modules/products/ui/storefront/catalogue-data";
import type { StorefrontCartIntent } from "@/modules/storefront-shell/client/storefront-client-state";

type VariantOptionsByProductId = Readonly<Record<string, readonly ProductVariantOption[]>>;

export function restoreCartLines(
  intents: readonly StorefrontCartIntent[],
  products: readonly Product[],
  variantOptionsByProductId: VariantOptionsByProductId,
): readonly CartLine[] {
  return projectCartIntents(intents, products, variantOptionsByProductId).lines;
}
