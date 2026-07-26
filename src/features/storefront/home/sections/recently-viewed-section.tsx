"use client";

import {
  useStorefrontOverlay,
  useStorefrontRecent,
} from "@/modules/storefront-shell/client/storefront-runtime";
import { HomeProductList } from "../components/home-product-list";
import { HomeSectionHeading } from "../components/home-section-heading";

export function RecentlyViewedSection() {
  const recent = useStorefrontRecent();
  const overlay = useStorefrontOverlay();

  return (
    <section className="section">
      <div className="shell">
        <HomeSectionHeading
          actionLabel="Open saved items"
          eyebrow="Keep exploring"
          onAction={() => overlay.open("savedDrawer")}
          title={
            <>
              Recently{" "}
              <span className="serif">
                <em>viewed</em>
              </span>
            </>
          }
        />
        {recent.items.length ? (
          <HomeProductList className="product-rail" id="recentRail" products={recent.items} />
        ) : (
          <div className="product-rail" id="recentRail">
            <div className="search-empty col-[1/-1]">Products you inspect will appear here.</div>
          </div>
        )}
      </div>
    </section>
  );
}
