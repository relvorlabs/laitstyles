"use client";

import { useEffect, useState } from "react";
import { useStorefrontExperience } from "@/features/storefront/shared/storefront-experience-provider";
import { type Product, productById, productToHoldable } from "./data";
import { ProductCard } from "./product-card";
import { useStorefront } from "./storefront-context";
import { FilterControls } from "./storefront-overlays";

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

// Ported from inventory.html: the full-page catalogue. Reuses the shared storefront
// context, ProductCard, header/footer, overlays and FilterControls; adds only the
// catalogue-specific layout (quick-nav, toolbar, density, sidebar, pagination).
function CatalogueApp() {
  const s = useStorefront();
  const [page, setPage] = useState(1);
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [sidebarVisible, setSidebarVisible] = useState(true);

  useEffect(() => {
    const d = sessionStorage.getItem("laitstyles-density");
    if (d === "compact" || d === "comfortable") setDensity(d);
  }, []);
  const changeDensity = (d: "comfortable" | "compact") => {
    setDensity(d);
    try {
      sessionStorage.setItem("laitstyles-density", d);
    } catch {
      // ignore
    }
  };

  // Reset to the first page whenever the active filter set changes (source: state.page = 1).
  const filterSig = `${s.category}|${s.collection}|${[...s.conditions].sort().join(",")}|${[...s.inventories].sort().join(",")}|${s.inStock}|${s.maxPrice}|${s.search}|${s.sort}`;
  // biome-ignore lint/correctness/useExhaustiveDependencies: page resets on filter-signature change only.
  useEffect(() => setPage(1), [filterSig]);

  const list = s.filteredList;
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const start = (current - 1) * PAGE_SIZE;
  const pageItems = list.slice(start, start + PAGE_SIZE);

  const applyQuick = (key: string) => {
    if (key === "all") s.applyShop({});
    else if (genderByKey[key]) s.applyShop({ category: genderByKey[key] });
    else s.applyShop({ collection: key });
  };
  const quickActive = (key: string) => {
    if (key === "all") return s.category === "All" && !s.collection;
    if (genderByKey[key]) return s.category === genderByKey[key];
    return s.collection === key;
  };

  const {
    state: { holdSecondsByProduct },
    actions: { holdProduct, releaseProduct },
  } = useStorefrontExperience();
  const cardHandlers = {
    onQuickView: s.openQuick,
    onSave: s.toggleSaved,
    // Add to bag supersedes an active hold, then commits to the cart.
    onAdd: (id: string) => {
      releaseProduct(id);
      s.addToCart(id);
    },
    onHold: (id: string) => {
      const product = productById(id);
      if (product) holdProduct(productToHoldable(product));
    },
    onRelease: releaseProduct,
  };
  const renderCards = (items: Product[]) =>
    items.map((p) => (
      <ProductCard
        key={p.id}
        product={p}
        isSaved={s.saved.has(p.id)}
        isHeld={p.id in holdSecondsByProduct}
        holdSeconds={holdSecondsByProduct[p.id] ?? null}
        {...cardHandlers}
      />
    ));

  const goToPage = (p: number) => {
    setPage(p);
    document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <main id="main" className="lst-catalogue">
      <div className="quick-nav-wrap">
        <nav className="shell quick-nav" aria-label="Quick collections">
          {quickLinks.map(([key, label]) => (
            <button
              key={key}
              className={`quick-link${quickActive(key) ? " active" : ""}`}
              type="button"
              aria-pressed={quickActive(key)}
              onClick={() => applyQuick(key)}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      <section className="catalogue-toolbar">
        <div className="shell">
          <div className="toolbar-main">
            <div className="toolbar-group">
              <button
                className="control-button mobile-filter-trigger"
                type="button"
                onClick={() => s.open("filterDrawer")}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M4 6h16M7 12h10M10 18h4" />
                </svg>
                Filters <span className="mono">{s.activeFilterChips.length}</span>
              </button>
              <button
                className={`control-button desktop-filter-toggle${sidebarVisible ? " active" : ""}`}
                type="button"
                onClick={() => setSidebarVisible((v) => !v)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M4 6h16M7 12h10M10 18h4" />
                </svg>
                {sidebarVisible ? "Hide filters" : "Show filters"}
              </button>
              <button className="control-button" type="button" onClick={() => s.open("sortSheet")}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M8 7h10M8 12h7M8 17h4M4 5v14" />
                </svg>
                Sort
              </button>
            </div>
            <div className="toolbar-group">
              <span id="resultCount" className="result-count mono">
                {list.length} products
              </span>
              <div className="density-control" aria-label="Product grid density">
                <button
                  className={density === "comfortable" ? "active" : ""}
                  type="button"
                  aria-label="Comfortable grid"
                  onClick={() => changeDensity("comfortable")}
                >
                  ▦
                </button>
                <button
                  className={density === "compact" ? "active" : ""}
                  type="button"
                  aria-label="Compact grid"
                  onClick={() => changeDensity("compact")}
                >
                  ▥
                </button>
              </div>
            </div>
          </div>
          {s.activeFilterChips.length > 0 && (
            <div id="activeFilters" className="active-filters">
              {s.activeFilterChips.map((chip) => (
                <button
                  key={`${chip.type}-${chip.value ?? chip.label}`}
                  className="filter-chip"
                  type="button"
                  onClick={() => s.removeFilter(chip.type, chip.value)}
                >
                  {chip.label} ×
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section id="products" className="catalogue">
        <div className={`shell catalogue-layout${sidebarVisible ? "" : " no-sidebar"}`}>
          <aside className="filter-sidebar" aria-label="Catalogue filters" hidden={!sidebarVisible}>
            <div className="filter-panel">
              <div className="filter-head">
                <h2>Refine the rack</h2>
                <button className="button button-ghost" type="button" onClick={s.clearFilters}>
                  Clear all
                </button>
              </div>
              <FilterControls />
            </div>
          </aside>

          <div className="results">
            {list.length ? (
              <div id="productGrid" className={`product-grid ${density}`} aria-live="polite">
                {renderCards(pageItems)}
              </div>
            ) : (
              <div id="emptyState" className="empty-state">
                <h2>No pieces match this edit.</h2>
                <p>Clear one or more filters or return to the complete rack.</p>
                <button className="button button-primary" type="button" onClick={s.clearFilters}>
                  Clear filters
                </button>
              </div>
            )}
            {list.length > 0 && pages > 1 && (
              <nav id="pagination" className="pagination" aria-label="Product result pages">
                <button
                  className="page-button"
                  type="button"
                  disabled={current === 1}
                  aria-label="Previous page"
                  onClick={() => goToPage(Math.max(1, current - 1))}
                >
                  ←
                </button>
                {Array.from({ length: pages }, (_, i) => (
                  <button
                    key={i + 1}
                    className={`page-button${current === i + 1 ? " active" : ""}`}
                    type="button"
                    aria-label={`Page ${i + 1}`}
                    onClick={() => goToPage(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  className="page-button"
                  type="button"
                  disabled={current === pages}
                  aria-label="Next page"
                  onClick={() => goToPage(Math.min(pages, current + 1))}
                >
                  →
                </button>
              </nav>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

export function CatalogueLab({ fontClassName }: { fontClassName: string }) {
  void fontClassName;
  return <CatalogueApp />;
}
