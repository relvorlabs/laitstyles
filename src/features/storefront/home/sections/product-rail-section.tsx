"use client";

import type { ReactNode } from "react";
import type { Product } from "@/features/storefront/shared/catalogue-data";
import { HomeProductList } from "../components/home-product-list";
import { HomeSectionHeading } from "../components/home-section-heading";

export function ProductRailSection({
  eyebrow,
  title,
  actionLabel,
  onAction,
  products,
  id,
}: {
  eyebrow: string;
  title: ReactNode;
  actionLabel: string;
  onAction: () => void;
  products: Product[];
  id: string;
}) {
  return (
    <section className="section rail-section">
      <div className="shell">
        <HomeSectionHeading
          actionLabel={actionLabel}
          eyebrow={eyebrow}
          onAction={onAction}
          title={title}
        />
        <HomeProductList className="product-rail" id={id} products={products} />
      </div>
    </section>
  );
}
