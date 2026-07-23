"use client";

import { type Product, productToHoldable } from "@/features/storefront/shared/catalogue-data";
import { ProductCard } from "@/features/storefront/shared/product-card";
import { useStorefrontExperience } from "@/features/storefront/shared/storefront-experience-provider";
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
  const {
    state: { holdSecondsByProduct },
    actions: { holdProduct, releaseProduct },
  } = useStorefrontExperience();

  return (
    <div id={id} className={className}>
      {products.map((product) => (
        <ProductCard
          holdSeconds={holdSecondsByProduct[product.id] ?? null}
          isHeld={product.id in holdSecondsByProduct}
          isSaved={storefront.saved.has(product.id)}
          key={product.id}
          onAdd={(id) => {
            releaseProduct(id);
            storefront.addToCart(id);
          }}
          onHold={(id) => {
            const selectedProduct = storefront.productById(id);
            if (selectedProduct) holdProduct(productToHoldable(selectedProduct));
          }}
          onQuickView={storefront.openQuick}
          onRelease={releaseProduct}
          onSave={storefront.toggleSaved}
          product={product}
        />
      ))}
    </div>
  );
}
