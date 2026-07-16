"use client";

import { getHomeCategories } from "@/features/storefront/shared/catalogue-data";
import { useStorefront } from "@/features/storefront/shared/storefront-provider";
import { CategoryCard } from "../components/category-card";
import { HomeSectionHeading } from "../components/home-section-heading";
import type { OpenHomeShop } from "../home-types";

export function CategorySection({ openShop }: { openShop: OpenHomeShop }) {
  const storefront = useStorefront();
  const homeCategories = getHomeCategories(storefront.categories);
  return (
    <section className="category-section section">
      <div className="shell">
        <HomeSectionHeading
          actionLabel="View every product"
          eyebrow="Browse the rack"
          onAction={() => openShop({})}
          title={
            <>
              Shop by{" "}
              <span className="serif">
                <em>category</em>
              </span>
            </>
          }
        />
        <div id="categoryGrid" className="category-grid">
          {homeCategories.map(([name, image, count]) => (
            <CategoryCard
              key={name}
              name={name}
              image={image}
              count={count}
              onClick={() => openShop({ category: name })}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
