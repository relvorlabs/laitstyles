"use client";

import { Button } from "@/components/ui/button";
import { useCatalogueNavigation } from "@/modules/products/client/use-catalogue-navigation";
import { getFilterCategories, type Product } from "@/modules/products/ui/storefront/catalogue-data";
import { useStorefrontCatalogueData } from "@/modules/storefront-shell/client/storefront-runtime";

const inventoryRows: [Product["inventory"], string][] = [
  ["one-of-one", "One-of-one"],
  ["variant", "Variants"],
  ["matching-stock", "Multiple units"],
];

export function FilterControls() {
  const { products } = useStorefrontCatalogueData();
  const navigation = useCatalogueNavigation();
  const { search } = navigation;
  const filterCategories = getFilterCategories(products);
  const countByCategory = (value: string) =>
    products.filter((product) => product.category === value || product.type === value).length;

  return (
    <>
      <section className="filter-section">
        <h3>Category</h3>
        <div className="filter-options">
          <label className="check">
            <span>
              <input
                checked={!search.category}
                name="categoryFilter"
                onChange={() => navigation.setCategory(null)}
                type="radio"
                value="All"
              />{" "}
              All products
            </span>
            <span className="check-count">{products.length}</span>
          </label>
          {filterCategories.map((value) => (
            <label className="check" key={value}>
              <span>
                <input
                  checked={search.category === value}
                  name="categoryFilter"
                  onChange={() => navigation.setCategory(value)}
                  type="radio"
                  value={value}
                />{" "}
                {value}
              </span>
              <span className="check-count">{countByCategory(value)}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="filter-section">
        <h3>Condition</h3>
        <div className="filter-options">
          {(["A+", "A", "B+"] as const).map((value) => (
            <label className="check" key={value}>
              <span>
                <input
                  checked={search.conditions.includes(value)}
                  onChange={(event) => navigation.toggleCondition(value, event.target.checked)}
                  type="checkbox"
                  value={value}
                />{" "}
                Grade {value}
              </span>
              <span className="check-count">
                {products.filter((product) => product.condition === value).length}
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="filter-section">
        <h3>Inventory</h3>
        <div className="filter-options">
          {inventoryRows.map(([value, label]) => (
            <label className="check" key={value}>
              <span>
                <input
                  checked={search.inventories.includes(value)}
                  onChange={(event) => navigation.toggleInventory(value, event.target.checked)}
                  type="checkbox"
                  value={value}
                />{" "}
                {label}
              </span>
              <span className="check-count">
                {products.filter((product) => product.inventory === value).length}
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="filter-section">
        <h3>Price</h3>
        <div className="price-range">
          <Button
            onClick={() => navigation.replace({ maxPriceNaira: 25_000 })}
            type="button"
            variant="outline"
          >
            Under ₦25k
          </Button>
          <Button
            onClick={() => navigation.replace({ maxPriceNaira: 40_000 })}
            type="button"
            variant="outline"
          >
            Under ₦40k
          </Button>
        </div>
      </section>

      <section className="filter-section">
        <label className="check">
          <span>
            <input
              checked={search.inStock}
              onChange={(event) => navigation.replace({ inStock: event.target.checked })}
              type="checkbox"
            />{" "}
            In stock only
          </span>
          <span className="check-count">
            {products.filter((product) => product.status === "available").length}
          </span>
        </label>
      </section>
    </>
  );
}
