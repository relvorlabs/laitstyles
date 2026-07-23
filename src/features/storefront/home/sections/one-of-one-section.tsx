"use client";

import type { Product } from "@/features/storefront/shared/catalogue-data";
import { useStorefront } from "@/features/storefront/shared/storefront-provider";
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
  const storefront = useStorefront();

  return (
    <section className="section">
      <div className="shell">
        <HomeSectionHeading
          actionLabel="View the full edit"
          eyebrow="Exact item photographed"
          onAction={() => openShop({ collection: "one-of-one" })}
          subtitle="Unique garments with no planned restock. What you see is the exact piece you receive."
          title={
            <>
              The one-of-one{" "}
              <span className="serif">
                <em>edit</em>
              </span>
            </>
          }
        />
        <div id="oneEdit" className="one-edit">
          {products.map((product, index) => (
            <OneOfOneCard
              key={product.id}
              product={product}
              featured={index === 0}
              onClick={() => storefront.openQuick(product.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
