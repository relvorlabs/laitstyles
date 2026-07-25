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
  const catalog = useStorefrontCatalogData();
  const cart = useStorefrontCart();
  const saved = useStorefrontSavedItems();
  const holds = useStorefrontHolds();
  const lookup = new Map(catalog.products.map((product) => [product.id, product]));

  return (
    <div className={cn(layouts[layout], className)}>
      {products.map((product) => (
        <ProductCard
          holdSeconds={holds.secondsByProduct[product.id] ?? null}
          isHeld={product.id in holds.secondsByProduct}
          isSaved={saved.idSet.has(product.id)}
          key={product.id}
          onAdd={(id) => {
            holds.releaseProduct(id);
            cart.addProduct(id);
          }}
          onHold={(id) => {
            const target = lookup.get(id);
            if (!target || target.status !== "available") return;
            holds.holdProduct(id);
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
