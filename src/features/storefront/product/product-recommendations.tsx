"use client";

import Link from "next/link";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
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
import { selectProductRecommendations } from "./product-detail-presentation";

export function ProductRecommendations({
  product,
  title,
  eyebrow,
  columns,
}: {
  product: Product;
  title: string;
  eyebrow: string;
  columns: "styled" | "related";
}) {
  const catalog = useStorefrontCatalogData();
  const cart = useStorefrontCart();
  const saved = useStorefrontSavedItems();
  const holds = useStorefrontHolds();
  const productLookup = new Map(catalog.products.map((candidate) => [candidate.id, candidate]));
  const groups = selectProductRecommendations(catalog.products, product);
  const products = columns === "styled" ? groups.styledWith : groups.related;

  return (
    <section aria-labelledby={`${columns}-recommendations-title`}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">
            {eyebrow}
          </p>
          <h2
            className={`mt-2 font-serif font-medium ${columns === "styled" ? "text-3xl" : "text-4xl"}`}
            id={`${columns}-recommendations-title`}
          >
            {title}
          </h2>
        </div>
        <Link className="text-[10px] font-semibold underline underline-offset-4" href="/products">
          {columns === "styled" ? "Shop edit" : "View all"}
        </Link>
      </div>

      {products.length > 0 ? (
        <div
          className={
            columns === "styled"
              ? "mt-5 grid grid-cols-2 gap-3"
              : "mt-6 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-6"
          }
        >
          {products.map((candidate) => (
            <ProductCard
              holdSeconds={holds.secondsByProduct[candidate.id] ?? null}
              isHeld={candidate.id in holds.secondsByProduct}
              isSaved={saved.idSet.has(candidate.id)}
              key={candidate.id}
              onAdd={(id) => {
                holds.releaseProduct(id);
                cart.addProduct(id);
              }}
              onHold={(id) => {
                const target = productLookup.get(id);
                if (!target || target.status !== "available") return;
                holds.holdProduct(id);
                showStorefrontToast(`${target.name} is held for 15 minutes.`);
              }}
              onQuickView={openQuickView}
              onRelease={holds.releaseProduct}
              onSave={saved.toggleProduct}
              product={candidate}
            />
          ))}
        </div>
      ) : (
        <Empty className="mt-5 min-h-52 border border-border bg-surface-sunken">
          <EmptyHeader>
            <EmptyTitle>No recommendations available</EmptyTitle>
            <EmptyDescription>
              This edit will populate when more matching catalogue products are available.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </section>
  );
}
