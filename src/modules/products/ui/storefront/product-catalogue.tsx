"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ParsedCatalogueSearch } from "@/modules/products/client/catalogue-search-params";
import {
  type CatalogueFilterType,
  useCatalogueNavigation,
} from "@/modules/products/client/use-catalogue-navigation";
import {
  openQuickView,
} from "@/modules/storefront-shell/client/storefront-overlay-events";
import {
  showStorefrontToast,
  useStorefrontCart,
  useStorefrontCatalogueData,
  useStorefrontHolds,
  useStorefrontOverlay,
  useStorefrontSavedItems,
} from "@/modules/storefront-shell/client/storefront-runtime";
import { inventoryLabel, money, type Product } from "./catalogue-data";
import { FilterControls } from "./filter-controls";
import { ProductCard } from "./product-card";

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

type FilterChip = { type: CatalogueFilterType; label: string; value?: string };

function CatalogueApp({
  productIds,
  total,
  page,
  pageCount,
  search,
}: {
  productIds: readonly string[];
  total: number;
  page: number;
  pageCount: number;
  search: ParsedCatalogueSearch;
}) {
  const navigation = useCatalogueNavigation(search);
  const { products } = useStorefrontCatalogueData();
  const cart = useStorefrontCart();
  const saved = useStorefrontSavedItems();
  const holds = useStorefrontHolds();
  const overlay = useStorefrontOverlay();
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [sidebarVisible, setSidebarVisible] = useState(true);

  useEffect(() => {
    const storedDensity = sessionStorage.getItem("laitstyles-density");
    if (storedDensity === "compact" || storedDensity === "comfortable") {
      setDensity(storedDensity);
    }
  }, []);

  const productLookup = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );
  const pageItems = productIds.flatMap((id) => {
    const product = productLookup.get(id);
    return product ? [product] : [];
  });
  const chips = useMemo(() => activeFilterChips(navigation.search), [navigation.search]);

  const changeDensity = (nextDensity: "comfortable" | "compact") => {
    setDensity(nextDensity);
    try {
      sessionStorage.setItem("laitstyles-density", nextDensity);
    } catch {
      // Grid density remains local if storage is unavailable.
    }
  };

  const clearFilters = () => {
    navigation.clear();
    showStorefrontToast("Filters cleared.");
  };

  const cardHandlers = {
    onQuickView: openQuickView,
    onSave: saved.toggleProduct,
    onAdd: (id: string) => {
      holds.releaseProduct(id);
      cart.addProduct(id);
    },
    onHold: (id: string) => {
      const product = productLookup.get(id);
      if (!product || product.status !== "available") return;
      holds.holdProduct(id);
      showStorefrontToast(`${product.name} is held for 15 minutes.`);
    },
    onRelease: holds.releaseProduct,
  };
  const renderCards = (items: Product[]) =>
    items.map((product) => (
      <ProductCard
        {...cardHandlers}
        holdSeconds={holds.secondsByProduct[product.id] ?? null}
        isHeld={product.id in holds.secondsByProduct}
        isSaved={saved.idSet.has(product.id)}
        key={product.id}
        product={product}
      />
    ));

  const goToPage = (nextPage: number) => {
    navigation.goToPage(nextPage);
    document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <main className="lst-catalogue" id="main">
      <div className="quick-nav-wrap">
        <nav aria-label="Quick collections" className="shell quick-nav">
          {quickLinks.map(([key, label]) => {
            const active = navigation.isQuickActive(key);
            return (
              <Button
                aria-pressed={active}
                key={key}
                onClick={() => navigation.applyQuick(key)}
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
                onClick={() => overlay.open("filterDrawer")}
                type="button"
                variant="outline"
              >
                <svg aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M4 6h16M7 12h10M10 18h4" />
                </svg>
                Filters <span className="mono">{chips.length}</span>
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
              <Button
                onClick={() => overlay.open("sortSheet")}
                type="button"
                variant="outline"
              >
                <svg aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M8 7h10M8 12h7M8 17h4M4 5v14" />
                </svg>
                Sort
              </Button>
            </div>
            <div className="toolbar-group">
              <span aria-live="polite" className="result-count mono" id="resultCount">
                {total} products
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
          {chips.length > 0 ? (
            <div className="active-filters" id="activeFilters">
              {chips.map((chip) => (
                <Button
                  key={`${chip.type}-${chip.value ?? chip.label}`}
                  onClick={() => navigation.removeFilter(chip.type, chip.value)}
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
                <Button onClick={clearFilters} type="button" variant="ghost">
                  Clear all
                </Button>
              </div>
              <FilterControls />
            </div>
          </aside>

          <div className="results">
            {total > 0 ? (
              <div aria-live="polite" className={`product-grid ${density}`} id="productGrid">
                {renderCards(pageItems)}
              </div>
            ) : (
              <div className="empty-state" id="emptyState">
                <h2>No pieces match this edit.</h2>
                <p>Clear one or more filters or return to the complete rack.</p>
                <Button onClick={clearFilters} type="button">
                  Clear filters
                </Button>
              </div>
            )}
            {total > 0 && pageCount > 1 ? (
              <nav aria-label="Product result pages" className="pagination" id="pagination">
                <Button
                  aria-label="Previous page"
                  disabled={page === 1}
                  onClick={() => goToPage(Math.max(1, page - 1))}
                  type="button"
                  variant="outline"
                >
                  ←
                </Button>
                {Array.from({ length: pageCount }, (_, index) => {
                  const pageNumber = index + 1;
                  const active = page === pageNumber;
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
                  disabled={page === pageCount}
                  onClick={() => goToPage(Math.min(pageCount, page + 1))}
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

function activeFilterChips(search: ParsedCatalogueSearch): FilterChip[] {
  const values: FilterChip[] = [];
  if (search.category) values.push({ type: "category", label: search.category });
  if (search.collection) {
    values.push({ type: "collection", label: search.collection.replaceAll("-", " ") });
  }
  for (const value of search.conditions) {
    values.push({ type: "condition", label: `Grade ${value}`, value });
  }
  for (const value of search.inventories) {
    values.push({
      type: "inventory",
      label: inventoryLabel(value as Product["inventory"]),
      value,
    });
  }
  if (search.inStock) values.push({ type: "stock", label: "In stock" });
  if (search.maxPriceNaira !== undefined) {
    values.push({ type: "price", label: `Under ${money(search.maxPriceNaira)}` });
  }
  if (search.search) values.push({ type: "search", label: `Search: ${search.search}` });
  return values;
}

export function ProductCatalogue({
  fontClassName,
  productIds,
  total,
  page,
  pageCount,
  search,
}: {
  fontClassName: string;
  productIds: readonly string[];
  total: number;
  page: number;
  pageCount: number;
  search: ParsedCatalogueSearch;
}) {
  void fontClassName;
  return (
    <CatalogueApp
      page={page}
      pageCount={pageCount}
      productIds={productIds}
      search={search}
      total={total}
    />
  );
}
