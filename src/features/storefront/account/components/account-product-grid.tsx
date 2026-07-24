"use client";

import type { Product } from "@/features/storefront/shared/catalogue-data";
import { ProductCard } from "@/features/storefront/shared/product-card";
import { useStorefrontClientState } from "@/features/storefront/shared/storefront-client-state-provider";
import { useStorefront } from "@/features/storefront/shared/storefront-provider";
import { cn } from "@/lib/utils";

const layouts = {
  grid: "grid gap-5 sm:grid-cols-2 xl:grid-cols-3",
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
  const storefront = useStorefront();
  const clientState = useStorefrontClientState();

  return (
    <div className={cn(layouts[layout], className)}>
      {products.map((product) => (
        <ProductCard
          holdSeconds={clientState.holdSecondsByProduct[product.id] ?? null}
          isHeld={product.id in clientState.holdSecondsByProduct}
          isSaved={storefront.saved.has(product.id)}
          key={product.id}
          onAdd={(id) => {
            clientState.releaseProduct(id);
            storefront.addToCart(id);
          }}
          onHold={(id) => {
            const target = storefront.productById(id);
            if (target && clientState.holdProduct(id)) {
              storefront.showToast(`${target.name} is held for 15 minutes.`);
            }
          }}
          onQuickView={storefront.openQuick}
          onRelease={clientState.releaseProduct}
          onSave={storefront.toggleSaved}
          product={product}
        />
      ))}
    </div>
  );
}
