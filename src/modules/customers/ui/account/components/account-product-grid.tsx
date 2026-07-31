"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { Product } from "@/modules/products/ui/storefront/catalogue-data";
import { ProductCard } from "@/modules/products/ui/storefront/product-card";
import { openQuickView } from "@/modules/storefront-shell/client/storefront-overlay-events";
import {
  showStorefrontToast,
  useStorefrontCart,
  useStorefrontCatalogueData,
  useStorefrontHolds,
  useStorefrontSavedItems,
} from "@/modules/storefront-shell/client/storefront-runtime";

const layouts = {
  grid: "grid gap-5 sm:grid-cols-2 xl:grid-cols-3",
  rail: "grid auto-cols-[78%] grid-flow-col gap-4 overflow-x-auto pb-3 sm:auto-cols-[44%] lg:grid-flow-row lg:grid-cols-3 lg:overflow-visible",
} as const;

function uniqueProducts(products: readonly Product[]): Product[] {
  const byId = new Map<string, Product>();
  for (const product of products) byId.set(product.id, product);
  return Array.from(byId.values());
}

export function AccountProductGrid({
  products,
  layout = "grid",
  className,
}: {
  products: Product[];
  layout?: keyof typeof layouts;
  className?: string;
}) {
  const catalogue = useStorefrontCatalogueData();
  const cart = useStorefrontCart();
  const saved = useStorefrontSavedItems();
  const holds = useStorefrontHolds();
  const visibleProducts = useMemo(() => uniqueProducts(products), [products]);
  const lookup = useMemo(
    () => new Map(uniqueProducts(catalogue.products).map((product) => [product.id, product])),
    [catalogue.products],
  );

  return (
    <div className={cn(layouts[layout], className)}>
      {visibleProducts.map((product) => (
        <ProductCard
          holdSeconds={holds.secondsByProduct[product.id] ?? null}
          isHeld={product.id in holds.secondsByProduct}
          isSaved={saved.idSet.has(product.id)}
          key={`account-product:${product.id}`}
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
