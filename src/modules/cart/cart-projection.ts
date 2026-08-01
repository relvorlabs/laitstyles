import { koboToNaira } from "@/lib/money";
import type { ProductVariantOption } from "@/lib/storefront/types";
import { addCartLine, type CartLine, type CartSelection } from "@/modules/cart/cart-lines";
import type { Product } from "@/modules/products/ui/storefront/catalogue-data";
import type { StorefrontCartIntent } from "@/modules/storefront-shell/client/storefront-client-state";

type VariantOptionsByProductId = Readonly<Record<string, readonly ProductVariantOption[]>>;

export type CartProjectionResult = {
  lines: readonly CartLine[];
  unresolved: readonly StorefrontCartIntent[];
};

function resolveVariantSelection(
  product: Product,
  token: string | null,
  variants: readonly ProductVariantOption[],
): CartSelection | null {
  if (product.inventory !== "variant" || !token) return null;
  const matches = variants.filter(
    (variant) => variant.id === token || variant.label === token || variant.size === token,
  );
  if (matches.length !== 1) return null;

  const variant = matches[0];
  if (!variant || variant.availability.available < 1) return null;
  return {
    variantId: variant.id,
    variantLabel: variant.label,
    colour: variant.colour,
    size: variant.size,
    unitPriceNaira: koboToNaira(variant.price ?? product.price * 100),
    maxQuantity: variant.availability.available,
  };
}

export function projectCartIntents(
  intents: readonly StorefrontCartIntent[],
  products: readonly Product[],
  variantOptionsByProductId: VariantOptionsByProductId,
): CartProjectionResult {
  let lines: readonly CartLine[] = [];
  const unresolved: StorefrontCartIntent[] = [];

  for (const intent of intents) {
    const product = products.find(
      (candidate) => candidate.id === intent.productId || candidate.databaseId === intent.productId,
    );
    if (!product) {
      unresolved.push(intent);
      continue;
    }

    const selection = resolveVariantSelection(
      product,
      intent.variantId,
      variantOptionsByProductId[product.id] ?? [],
    );
    if (product.inventory === "variant" && !selection) {
      unresolved.push(intent);
      continue;
    }

    const next = addCartLine(lines, product, selection, intent.quantity);
    if (next === lines) {
      unresolved.push(intent);
      continue;
    }
    lines = next;
  }

  return { lines, unresolved };
}
