"use client";

import { getHomeCategories } from "@/features/storefront/shared/catalogue-data";
import { useStorefrontCatalogData } from "@/features/storefront/shared/storefront-runtime";
import { CategoryCard } from "../components/category-card";
import { HomeSectionHeading } from "../components/home-section-heading";
import type { OpenHomeShop } from "../home-types";

export function CategorySection({ openShop }: { openShop: OpenHomeShop }) {
  const { categories } = useStorefrontCatalogData();
  const homeCategories = getHomeCategories(categories);
  return (
    <section className="category-section section">
      <div className="shell">
        <HomeSectionHeading
          actionLabel="View every product"
          eyebrow="Browse the rack"
          onAction={() => openShop({})}
          title={<>Shop by <span className="serif"><em>category</em></span></>}
        />
        <div className="category-grid" id="categoryGrid">
          {homeCategories.map(([name, image, count]) => (
            <CategoryCard count={count} image={image} key={name} name={name} onClick={() => openShop({ category: name })} />
          ))}
        </div>
      </div>
    </section>
  );
}
