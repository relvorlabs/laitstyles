import type { ProductVariantOption } from "@/lib/storefront/types";
import type { CartLine } from "@/modules/cart/cart-lines";
import { projectCartIntents } from "@/modules/cart/cart-projection";
import type { Product } from "@/modules/products/ui/storefront/catalogue-data";
import type { StorefrontCartIntent } from "@/modules/storefront-shell/client/storefront-client-state";

type VariantOptionsByProductId = Readonly<Record<string, readonly ProductVariantOption[]>>;

export type CartHydrationDecision =
  | {
      kind: "wait";
      reason: "catalogue-unavailable" | "unresolved-intent";
      unresolved: readonly StorefrontCartIntent[];
    }
  | { kind: "hydrate"; lines: readonly CartLine[] };

export function decideCartHydration(
  availability: "ready" | "temporarily-unavailable",
  intents: readonly StorefrontCartIntent[],
  products: readonly Product[],
  variantOptionsByProductId: VariantOptionsByProductId,
): CartHydrationDecision {
  if (availability !== "ready") {
    return {
      kind: "wait",
      reason: "catalogue-unavailable",
      unresolved: [...intents],
    };
  }

  const projection = projectCartIntents(intents, products, variantOptionsByProductId);
  if (projection.unresolved.length > 0) {
    return {
      kind: "wait",
      reason: "unresolved-intent",
      unresolved: projection.unresolved,
    };
  }

  return { kind: "hydrate", lines: projection.lines };
}
