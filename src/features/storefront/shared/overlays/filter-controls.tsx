"use client";

import { Button } from "@/components/ui/button";
import { getFilterCategories, type Product } from "../catalogue-data";
import { useStorefront } from "../storefront-provider";

const inventoryRows: [string, string][] = [
  ["one-of-one", "One-of-one"],
  ["variant", "Variants"],
  ["matching-stock", "Multiple units"],
];

export function FilterControls() {
  const storefront = useStorefront();
  const { products } = storefront;
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
                type="radio"
                name="categoryFilter"
                value="All"
                checked={storefront.category === "All"}
                onChange={() => {
                  storefront.setCategory("All");
                  storefront.setCollection(null);
                }}
              />{" "}
              All products
            </span>
            <span className="check-count">{products.length}</span>
          </label>
          {filterCategories.map((value) => (
            <label key={value} className="check">
              <span>
                <input
                  type="radio"
                  name="categoryFilter"
                  value={value}
                  checked={storefront.category === value}
                  onChange={() => {
                    storefront.setCategory(value);
                    storefront.setCollection(null);
                  }}
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
          {["A+", "A", "B+"].map((value) => (
            <label key={value} className="check">
              <span>
                <input
                  type="checkbox"
                  value={value}
                  checked={storefront.conditions.has(value)}
                  onChange={(event) =>
                    storefront.setConditions((previous) => {
                      const next = new Set(previous);
                      if (event.target.checked) next.add(value);
                      else next.delete(value);
                      return next;
                    })
                  }
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
            <label key={value} className="check">
              <span>
                <input
                  type="checkbox"
                  value={value}
                  checked={storefront.inventories.has(value)}
                  onChange={(event) =>
                    storefront.setInventories((previous) => {
                      const next = new Set(previous);
                      if (event.target.checked) next.add(value);
                      else next.delete(value);
                      return next;
                    })
                  }
                />{" "}
                {label}
              </span>
              <span className="check-count">
                {
                  products.filter(
                    (product) => product.inventory === (value as Product["inventory"]),
                  ).length
                }
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="filter-section">
        <h3>Price</h3>
        <div className="price-range">
          <Button type="button" onClick={() => storefront.setMaxPrice(25000)} variant="outline">
            Under ₦25k
          </Button>
          <Button type="button" onClick={() => storefront.setMaxPrice(40000)} variant="outline">
            Under ₦40k
          </Button>
        </div>
      </section>

      <section className="filter-section">
        <label className="check">
          <span>
            <input
              type="checkbox"
              checked={storefront.inStock}
              onChange={(event) => storefront.setInStock(event.target.checked)}
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
