"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { type Product, productToHoldable } from "@/features/storefront/shared/catalogue-data";
import { FilterControls } from "@/features/storefront/shared/overlays/filter-controls";
import { ProductCard } from "@/features/storefront/shared/product-card";
import { useStorefrontExperience } from "@/features/storefront/shared/storefront-experience-provider";
import { useStorefront } from "@/features/storefront/shared/storefront-provider";

const PAGE_SIZE = 12;
const quickLinks: [string, string][] = [
  ["all", "All"],
  ["new", "New arrivals"],
  ["women", "Women"],
  ["men", "Men"],
  ["unisex", "Unisex"],
  ["one-of-one", "One-of-one"],
  ["under-25", "Under ₦25,000"],
  ["grade-a-plus", "Grade A+"],
  ["vintage", "Vintage"],
];
const genderByKey: Record<string, string> = { women: "Women", men: "Men", unisex: "Unisex" };

function CatalogueApp() {
  const storefront = useStorefront();
  const [page, setPage] = useState(1);
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [sidebarVisible, setSidebarVisible] = useState(true);

  useEffect(() => {
    const storedDensity = sessionStorage.getItem("laitstyles-density");
    if (storedDensity === "compact" || storedDensity === "comfortable") {
      setDensity(storedDensity);
    }
  }, []);

  const changeDensity = (nextDensity: "comfortable" | "compact") => {
    setDensity(nextDensity);
    try {
      sessionStorage.setItem("laitstyles-density", nextDensity);
    } catch {
      // Ignore unavailable storage.
    }
  };

  const filterSignature = `${storefront.category}|${storefront.collection}|${[
    ...storefront.conditions,
  ]
    .sort()
    .join(",")}|${[...storefront.inventories].sort().join(",")}|${storefront.inStock}|${
    storefront.maxPrice
  }|${storefront.search}|${storefront.sort}`;
  // biome-ignore lint/correctness/useExhaustiveDependencies: page resets on filter-signature change only.
  useEffect(() => setPage(1), [filterSignature]);

  const list = storefront.filteredList;
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const start = (current - 1) * PAGE_SIZE;
  const pageItems = list.slice(start, start + PAGE_SIZE);

  const applyQuick = (key: string) => {
    if (key === "all") storefront.applyShop({});
    else if (genderByKey[key]) storefront.applyShop({ category: genderByKey[key] });
    else storefront.applyShop({ collection: key });
  };
  const quickActive = (key: string) => {
    if (key === "all") return storefront.category === "All" && !storefront.collection;
    if (genderByKey[key]) return storefront.category === genderByKey[key];
    return storefront.collection === key;
  };

  const {
    state: { holdSecondsByProduct },
    actions: { holdProduct, releaseProduct },
  } = useStorefrontExperience();
  const cardHandlers = {
    onQuickView: storefront.openQuick,
    onSave: storefront.toggleSaved,
    onAdd: (id: string) => {
      releaseProduct(id);
      storefront.addToCart(id);
    },
    onHold: (id: string) => {
      const product = storefront.productById(id);
      if (product) holdProduct(productToHoldable(product));
    },
    onRelease: releaseProduct,
  };
  const renderCards = (items: Product[]) =>
    items.map((product) => (
      <ProductCard
        {...cardHandlers}
        holdSeconds={holdSecondsByProduct[product.id] ?? null}
        isHeld={product.id in holdSecondsByProduct}
        isSaved={storefront.saved.has(product.id)}
        key={product.id}
        product={product}
      />
    ));

  const goToPage = (nextPage: number) => {
    setPage(nextPage);
    document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <main className="lst-catalogue" id="main">
      <div className="quick-nav-wrap">
        <nav aria-label="Quick collections" className="shell quick-nav">
          {quickLinks.map(([key, label]) => {
            const active = quickActive(key);
            return (
              <Button
                aria-pressed={active}
                key={key}
                onClick={() => applyQuick(key)}
                type="button"
                variant={active ? "secondary" : "ghost"}
              >
                {label}
              </Button>
            );
          })}
        </nav>
      </div>

      <section className="catalogue-toolbar">
        <div className="shell">
          <div className="toolbar-main">
            <div className="toolbar-group">
              <Button
                onClick={() => storefront.open("filterDrawer")}
                type="button"
                variant="outline"
              >
                <svg aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M4 6h16M7 12h10M10 18h4" />
                </svg>
                Filters <span className="mono">{storefront.activeFilterChips.length}</span>
              </Button>
              <Button
                aria-pressed={sidebarVisible}
                onClick={() => setSidebarVisible((visible) => !visible)}
                type="button"
                variant="outline"
              >
                <svg aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M4 6h16M7 12h10M10 18h4" />
                </svg>
                {sidebarVisible ? "Hide filters" : "Show filters"}
              </Button>
              <Button onClick={() => storefront.open("sortSheet")} type="button" variant="outline">
                <svg aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M8 7h10M8 12h7M8 17h4M4 5v14" />
                </svg>
                Sort
              </Button>
            </div>
            <div className="toolbar-group">
              <span className="result-count mono" id="resultCount">
                {list.length} products
              </span>
              <div aria-label="Product grid density" className="density-control" role="group">
                <Button
                  aria-label="Comfortable grid"
                  aria-pressed={density === "comfortable"}
                  onClick={() => changeDensity("comfortable")}
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                >
                  ▦
                </Button>
                <Button
                  aria-label="Compact grid"
                  aria-pressed={density === "compact"}
                  onClick={() => changeDensity("compact")}
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                >
                  ▥
                </Button>
              </div>
            </div>
          </div>
          {storefront.activeFilterChips.length > 0 ? (
            <div className="active-filters" id="activeFilters">
              {storefront.activeFilterChips.map((chip) => (
                <Button
                  key={`${chip.type}-${chip.value ?? chip.label}`}
                  onClick={() => storefront.removeFilter(chip.type, chip.value)}
                  type="button"
                  variant="secondary"
                >
                  {chip.label} ×
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="catalogue" id="products">
        <div className={`shell catalogue-layout${sidebarVisible ? "" : " no-sidebar"}`}>
          <aside aria-label="Catalogue filters" className="filter-sidebar" hidden={!sidebarVisible}>
            <div className="filter-panel">
              <div className="filter-head">
                <h2>Refine the rack</h2>
                <Button onClick={storefront.clearFilters} type="button" variant="ghost">
                  Clear all
                </Button>
              </div>
              <FilterControls />
            </div>
          </aside>

          <div className="results">
            {list.length ? (
              <div aria-live="polite" className={`product-grid ${density}`} id="productGrid">
                {renderCards(pageItems)}
              </div>
            ) : (
              <div className="empty-state" id="emptyState">
                <h2>No pieces match this edit.</h2>
                <p>Clear one or more filters or return to the complete rack.</p>
                <Button onClick={storefront.clearFilters} type="button">
                  Clear filters
                </Button>
              </div>
            )}
            {list.length > 0 && pages > 1 ? (
              <nav aria-label="Product result pages" className="pagination" id="pagination">
                <Button
                  aria-label="Previous page"
                  disabled={current === 1}
                  onClick={() => goToPage(Math.max(1, current - 1))}
                  type="button"
                  variant="outline"
                >
                  ←
                </Button>
                {Array.from({ length: pages }, (_, index) => {
                  const pageNumber = index + 1;
                  const active = current === pageNumber;
                  return (
                    <Button
                      aria-current={active ? "page" : undefined}
                      aria-label={`Page ${pageNumber}`}
                      key={pageNumber}
                      onClick={() => goToPage(pageNumber)}
                      type="button"
                      variant={active ? "default" : "outline"}
                    >
                      {pageNumber}
                    </Button>
                  );
                })}
                <Button
                  aria-label="Next page"
                  disabled={current === pages}
                  onClick={() => goToPage(Math.min(pages, current + 1))}
                  type="button"
                  variant="outline"
                >
                  →
                </Button>
              </nav>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}

export function ProductCatalogue({ fontClassName }: { fontClassName: string }) {
  void fontClassName;
  return <CatalogueApp />;
}
