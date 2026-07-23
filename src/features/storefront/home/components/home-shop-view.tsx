"use client";

import { Button } from "@/components/ui/button";
import { useStorefront } from "@/features/storefront/shared/storefront-provider";
import { HomeProductList } from "./home-product-list";

export function HomeShopView({ onGoHome }: { onGoHome: () => void }) {
  const storefront = useStorefront();

  return (
    <div id="shopView" className="shop-view view-enter">
      <section className="shop-hero">
        <div className="shell">
          <div className="shop-kicker">
            <Button size="lg" type="button" onClick={onGoHome} variant="link">
              Home
            </Button>
            <span>/</span>
            <span id="shopBreadcrumb">{storefront.breadcrumb}</span>
          </div>
          <h1 id="shopTitle" className="shop-title">
            {storefront.title.title} <em>{storefront.title.em}</em>
          </h1>
          <div className="shop-meta">
            <p id="shopDescription">{storefront.title.description}</p>
            <span id="shopHeroCount" className="eyebrow">
              {storefront.filteredList.length} products
            </span>
          </div>
        </div>
      </section>

      <section className="shop-controls">
        <div className="shell">
          <div className="shop-controls-inner">
            <div className="filter-actions">
              <Button
                type="button"
                onClick={() => storefront.open("filterDrawer")}
                variant="outline"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                  <path d="M4 6h16M7 12h10M10 18h4" />
                </svg>
                Filters <span className="mono">{storefront.activeFilterChips.length}</span>
              </Button>
              <Button type="button" onClick={() => storefront.open("sortSheet")} variant="outline">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                  <path d="M8 7h10M8 12h7M8 17h4M4 5v14" />
                </svg>
                Sort
              </Button>
            </div>
            <span id="resultCount" className="result-count">
              {storefront.filteredList.length} products
            </span>
          </div>
          {storefront.activeFilterChips.length > 0 ? (
            <div id="activeFilters" className="active-filters">
              {storefront.activeFilterChips.map((chip) => (
                <Button
                  key={`${chip.type}-${chip.value ?? chip.label}`}
                  type="button"
                  onClick={() => storefront.removeFilter(chip.type, chip.value)}
                  variant="secondary"
                >
                  {chip.label} ×
                </Button>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="shop-grid-wrap">
        <div className="shell">
          {storefront.filteredList.length ? (
            <HomeProductList
              className="shop-grid"
              id="shopGrid"
              products={storefront.filteredList}
            />
          ) : (
            <div id="emptyState" className="empty-state">
              <h2>No pieces match this edit.</h2>
              <p>Clear one or more filters to return to the full rack.</p>
              <Button type="button" onClick={storefront.clearFilters}>
                Clear filters
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
