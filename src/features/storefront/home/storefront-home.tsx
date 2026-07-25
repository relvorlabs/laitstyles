"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useStorefrontCatalogueData } from "@/features/storefront/shared/storefront-runtime";
import { CategorySection } from "./sections/category-section";
import { HeroSection } from "./sections/hero-section";
import { NewArrivalsSection } from "./sections/new-arrivals-section";
import { NewsletterSection } from "./sections/newsletter-section";
import { OneOfOneSection } from "./sections/one-of-one-section";
import { ProductRailSection } from "./sections/product-rail-section";
import { RecentlyViewedSection } from "./sections/recently-viewed-section";
import { TrustSection } from "./sections/trust-section";

export function StorefrontHome({ fontClassName }: { fontClassName: string }) {
  void fontClassName;
  const router = useRouter();
  const { products } = useStorefrontCatalogueData();
  const newArrivals = products.filter((product) => product.new).slice(0, 8);
  const oneOfOneEdit = products
    .filter((product) => product.inventory === "one-of-one" && product.status === "available")
    .slice(0, 5);
  const underTwentyFive = products
    .filter((product) => product.price < 25_000 && product.status === "available")
    .slice(0, 8);
  const gradeAPlusEssentials = products
    .filter((product) => product.condition === "A+" && product.status === "available")
    .slice(0, 8);

  const openShop = useCallback(
    (options: { category?: string; collection?: string | null }) => {
      const params = new URLSearchParams();
      if (options.category) params.set("category", options.category);
      if (options.collection) {
        if (options.collection === "under-25") params.set("maxPrice", "25000");
        else if (options.collection === "grade-a-plus") params.set("condition", "A+");
        else params.set("collection", options.collection);
      }
      const query = params.toString();
      router.push(query ? `/products?${query}` : "/products");
    },
    [router],
  );

  return (
    <main id="main">
      <div className="home-view view-enter" id="homeView">
        <HeroSection openShop={openShop} />
        <NewArrivalsSection openShop={openShop} products={newArrivals} />
        <CategorySection openShop={openShop} />
        <OneOfOneSection openShop={openShop} products={oneOfOneEdit} />
        <ProductRailSection
          actionLabel="Shop the price edit"
          eyebrow="Smart wardrobe buys"
          id="underRail"
          onAction={() => openShop({ collection: "under-25" })}
          products={underTwentyFive}
          title={
            <>
              Under <span className="serif"><em>₦25,000</em></span>
            </>
          }
        />
        <ProductRailSection
          actionLabel="Shop Grade A+"
          eyebrow="Minimal wear · maximum rotation"
          id="essentialRail"
          onAction={() => openShop({ collection: "grade-a-plus" })}
          products={gradeAPlusEssentials}
          title={
            <>
              Grade A+ <span className="serif"><em>essentials</em></span>
            </>
          }
        />
        <TrustSection />
        <RecentlyViewedSection />
        <NewsletterSection />
      </div>
    </main>
  );
}
