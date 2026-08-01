"use client";

import type { Product } from "@/modules/products/ui/storefront/catalogue-data";
import { HomeProductList } from "../components/home-product-list";
import { HomeSectionHeading } from "../components/home-section-heading";
import type { OpenHomeShop } from "../home-types";

export function NewArrivalsSection({
  products,
  openShop,
}: {
  products: Product[];
  openShop: OpenHomeShop;
}) {
  return (
    <section id="newSection" className="section">
      <div className="shell">
        <HomeSectionHeading
          actionLabel="Shop all new arrivals"
          eyebrow="Just added"
          onAction={() => openShop({ collection: "new" })}
          subtitle="A tight edit of fresh finds, photographed and measured individually."
          title={
            <>
              New in{" "}
              <span className="serif">
                <em>this week</em>
              </span>
            </>
          }
        />
        <HomeProductList className="product-grid" id="newGrid" products={products} />
      </div>
    </section>
  );
}
