"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { useStorefront } from "@/features/storefront/shared/storefront-provider";
import { CategorySection } from "./sections/category-section";
import { HeroSection } from "./sections/hero-section";
import { NewArrivalsSection } from "./sections/new-arrivals-section";
import { NewsletterSection } from "./sections/newsletter-section";
import { OneOfOneSection } from "./sections/one-of-one-section";
import { ProductRailSection } from "./sections/product-rail-section";
import { RecentlyViewedSection } from "./sections/recently-viewed-section";
import { TrustSection } from "./sections/trust-section";

const HomeShopView = dynamic(() =>
  import("./components/home-shop-view").then((module) => module.HomeShopView),
);

export function StorefrontHome({ fontClassName }: { fontClassName: string }) {
  void fontClassName;
  const storefront = useStorefront();
  const newArrivals = storefront.products.filter((product) => product.new).slice(0, 8);
  const oneOfOneEdit = storefront.products
    .filter((product) => product.inventory === "one-of-one" && product.status === "available")
    .slice(0, 5);
  const underTwentyFive = storefront.products
    .filter((product) => product.price < 25000 && product.status === "available")
    .slice(0, 8);
  const gradeAPlusEssentials = storefront.products
    .filter((product) => product.condition === "A+" && product.status === "available")
    .slice(0, 8);
  const [view, setView] = useState<"home" | "shop">("home");

  const openShop = useCallback(
    (options: { category?: string; collection?: string | null }) => {
      storefront.applyShop(options);
      setView("shop");
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [storefront],
  );

  const goHome = useCallback(() => {
    setView("home");
    storefront.closeAll();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [storefront]);

  return (
    <main id="main">
      {view === "home" ? (
        <div id="homeView" className="home-view view-enter">
          <HeroSection openShop={openShop} />
          <NewArrivalsSection products={newArrivals} openShop={openShop} />
          <CategorySection openShop={openShop} />
          <OneOfOneSection products={oneOfOneEdit} openShop={openShop} />
          <ProductRailSection
            actionLabel="Shop the price edit"
            eyebrow="Smart wardrobe buys"
            id="underRail"
            onAction={() => openShop({ collection: "under-25" })}
            products={underTwentyFive}
            title={
              <>
                Under{" "}
                <span className="serif">
                  <em>₦25,000</em>
                </span>
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
                Grade A+{" "}
                <span className="serif">
                  <em>essentials</em>
                </span>
              </>
            }
          />
          <TrustSection />
          <RecentlyViewedSection />
          <NewsletterSection />
        </div>
      ) : (
        <HomeShopView onGoHome={goHome} />
      )}
    </main>
  );
}
