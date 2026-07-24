"use client";

import type { Product } from "@/features/storefront/shared/catalogue-data";
import { useStorefrontClientState } from "@/features/storefront/shared/storefront-client-state-provider";
import { ProductCard } from "@/features/storefront/shared/product-card";
import { useStorefront } from "@/features/storefront/shared/storefront-provider";

export function HomeProductList({
  products,
  className,
  id,
}: {
  products: Product[];
  className: string;
  id: string;
}) {
  const storefront = useStorefront();
  const clientState = useStorefrontClientState();

  return (
    <div id={id} className={className}>
      {products.map((product) => (
        <ProductCard
          holdSeconds={clientState.holdSecondsByProduct[product.id] ?? null}
          isHeld={product.id in clientState.holdSecondsByProduct}
          isSaved={storefront.saved.has(product.id)}
          key={product.id}
          onAdd={(productId) => {
            clientState.releaseProduct(productId);
            storefront.addToCart(productId);
          }}
          onHold={(productId) => {
            const target = storefront.productById(productId);
            if (target && clientState.holdProduct(productId)) {
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
