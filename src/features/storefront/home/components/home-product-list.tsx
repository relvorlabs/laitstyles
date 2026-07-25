"use client";

import type { Product } from "@/features/storefront/shared/catalogue-data";
import { openQuickView } from "@/features/storefront/shared/storefront-overlay-events";
import { ProductCard } from "@/features/storefront/shared/product-card";
import {
  showStorefrontToast,
  useStorefrontCart,
  useStorefrontCatalogData,
  useStorefrontHolds,
  useStorefrontSavedItems,
} from "@/features/storefront/shared/storefront-runtime";

export function HomeProductList({
  products,
  className,
  id,
}: {
  products: Product[];
  className: string;
  id: string;
}) {
  const catalog = useStorefrontCatalogData();
  const cart = useStorefrontCart();
  const saved = useStorefrontSavedItems();
  const holds = useStorefrontHolds();
  const lookup = new Map(catalog.products.map((product) => [product.id, product]));

  return (
    <div className={className} id={id}>
      {products.map((product) => (
        <ProductCard
          holdSeconds={holds.secondsByProduct[product.id] ?? null}
          isHeld={product.id in holds.secondsByProduct}
          isSaved={saved.idSet.has(product.id)}
          key={product.id}
          onAdd={(productId) => {
            holds.releaseProduct(productId);
            cart.addProduct(productId);
          }}
          onHold={(productId) => {
            const target = lookup.get(productId);
            if (!target || target.status !== "available") return;
            holds.holdProduct(productId);
            showStorefrontToast(`${target.name} is held for 15 minutes.`);
          }}
          onQuickView={openQuickView}
          onRelease={holds.releaseProduct}
          onSave={saved.toggleProduct}
          product={product}
        />
      ))}
    </div>
  );
}
