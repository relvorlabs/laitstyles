"use client";

import type { Product } from "@/modules/products/ui/storefront/catalogue-data";
import { openQuickView } from "@/modules/storefront-shell/client/storefront-overlay-events";
import { HomeSectionHeading } from "../components/home-section-heading";
import { OneOfOneCard } from "../components/one-of-one-card";
import type { OpenHomeShop } from "../home-types";

export function OneOfOneSection({
  products,
  openShop,
}: {
  products: Product[];
  openShop: OpenHomeShop;
}) {
  return (
    <section className="section">
      <div className="shell">
        <HomeSectionHeading
          actionLabel="View the full edit"
          eyebrow="Exact item photographed"
          onAction={() => openShop({ collection: "one-of-one" })}
          subtitle="Unique garments with no planned restock. What you see is the exact piece you receive."
          title={<>The one-of-one <span className="serif"><em>edit</em></span></>}
        />
        <div className="one-edit" id="oneEdit">
          {products.map((product, index) => (
            <OneOfOneCard
              featured={index === 0}
              key={product.id}
              onClick={() => openQuickView(product.id)}
              product={product}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
