"use client";

import { useStorefront } from "@/features/storefront/shared/storefront-provider";
import { HomeProductList } from "../components/home-product-list";
import { HomeSectionHeading } from "../components/home-section-heading";

export function RecentlyViewedSection() {
  const storefront = useStorefront();

  return (
    <section className="section">
      <div className="shell">
        <HomeSectionHeading
          actionLabel="Open saved items"
          eyebrow="Keep exploring"
          onAction={() => storefront.open("savedDrawer")}
          title={
            <>
              Recently{" "}
              <span className="serif">
                <em>viewed</em>
              </span>
            </>
          }
        />
        {storefront.recentList.length ? (
          <HomeProductList
            className="product-rail"
            id="recentRail"
            products={storefront.recentList}
          />
        ) : (
          <div id="recentRail" className="product-rail">
            <div className="search-empty col-[1/-1]">Products you inspect will appear here.</div>
          </div>
        )}
      </div>
    </section>
  );
}
