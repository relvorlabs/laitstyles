"use client";

// Reuses the SHARED storefront ProductCard + saved/hold/cart wiring (the exact
// card used on /products and /shop) so product design is consistent across the
// site and adapts to the account context. Data comes from the shared storefront
// experience (home-lab prototype catalogue + saved/hold state), not a separate
// account copy.

import type { Product } from "@/features/storefront/home-lab/data";
import { productById, productToHoldable } from "@/features/storefront/home-lab/data";
import { ProductCard } from "@/features/storefront/home-lab/product-card";
import { useStorefront } from "@/features/storefront/home-lab/storefront-context";
import { useStorefrontExperience } from "@/features/storefront/shared/storefront-experience-provider";
import { cn } from "@/lib/utils";

/** Saved + recently-viewed product lists from the shared storefront state. */
export function useAccountProducts() {
  const s = useStorefront();
  return { saved: s.savedList, recent: s.recentList };
}

/**
 * Grid of shared storefront ProductCards, wired to the same save/hold/quick-view/
 * add-to-bag handlers used across the storefront. `columns` adapts the grid to the
 * page it is used on (saved page = 3-up, overview rail = 3-up scroll).
 */
const layouts = {
  // Saved page: responsive multi-column grid.
  grid: "grid gap-5 sm:grid-cols-2 xl:grid-cols-3",
  // Overview: horizontal snap rail on mobile, 3-up grid on desktop.
  rail: "grid auto-cols-[78%] grid-flow-col gap-4 overflow-x-auto pb-3 sm:auto-cols-[44%] lg:grid-flow-row lg:grid-cols-3 lg:overflow-visible",
} as const;

export function AccountProductGrid({
  products,
  layout = "grid",
  className,
}: {
  products: Product[];
  layout?: keyof typeof layouts;
  className?: string;
}) {
  const s = useStorefront();
  const {
    state: { holdSecondsByProduct },
    actions: { holdProduct, releaseProduct },
  } = useStorefrontExperience();

  const handlers = {
    onQuickView: s.openQuick,
    onSave: s.toggleSaved,
    onAdd: (id: string) => {
      releaseProduct(id);
      s.addToCart(id);
    },
    onHold: (id: string) => {
      const product = productById(id);
      if (product) holdProduct(productToHoldable(product));
    },
    onRelease: releaseProduct,
  };

  return (
    <div className={cn(layouts[layout], className)}>
      {products.map((p) => (
        <ProductCard
          key={p.id}
          product={p}
          isSaved={s.saved.has(p.id)}
          isHeld={p.id in holdSecondsByProduct}
          holdSeconds={holdSecondsByProduct[p.id] ?? null}
          {...handlers}
        />
      ))}
    </div>
  );
}
