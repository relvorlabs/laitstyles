"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  catalogueHref,
  type ParsedCatalogueSearch,
} from "@/features/storefront/catalogue/catalogue-search-params";
import type { Product } from "@/features/storefront/shared/catalogue-data";
import { useStorefrontClientState } from "@/features/storefront/shared/storefront-client-state-provider";
import { FilterControls } from "@/features/storefront/shared/overlays/filter-controls";
import { ProductCard } from "@/features/storefront/shared/product-card";
import { useStorefront } from "@/features/storefront/shared/storefront-provider";

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

function searchFilterSignature(search: ParsedCatalogueSearch) {
  return JSON.stringify({
    category: search.category ?? "All",
    collection: search.collection,
    conditions: [...search.conditions].sort(),
    inventories: [...search.inventories].sort(),
    inStock: search.inStock,
    maxPrice: search.maxPriceNaira ?? null,
    search: search.search,
    sort: search.sort,
  });
}

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
  const router = useRouter();
  const storefront = useStorefront();
  const clientState = useStorefrontClientState();
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [filtersReady, setFiltersReady] = useState(false);
  const lastAppliedFilterSignature = useRef(searchFilterSignature(search));

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

  const localFilterSignature = JSON.stringify({
    category: storefront.category,
    collection: storefront.collection,
    conditions: [...storefront.conditions].sort(),
    inventories: [...storefront.inventories].sort(),
    inStock: storefront.inStock,
    maxPrice: storefront.maxPrice,
    search: storefront.search,
    sort: storefront.sort,
  });
  const serverFilterSignature = searchFilterSignature(search);

  // biome-ignore lint/correctness/useExhaustiveDependencies: signature-driven synchronization is intentional.
  useEffect(() => {
    setFiltersReady(false);
    lastAppliedFilterSignature.current = serverFilterSignature;
    storefront.setCategory(search.category ?? "All");
    storefront.setCollection(search.collection);
    storefront.setConditions(new Set(search.conditions));
    storefront.setInventories(new Set(search.inventories));
    storefront.setInStock(search.inStock);
    storefront.setMaxPrice(search.maxPriceNaira ?? null);
    storefront.setSearch(search.search);
    storefront.setSort(search.sort);
    const frame = window.requestAnimationFrame(() => setFiltersReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, [serverFilterSignature]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: the serialized signature is the dependency contract.
  useEffect(() => {
    if (!filtersReady || localFilterSignature === lastAppliedFilterSignature.current) return;
    lastAppliedFilterSignature.current = localFilterSignature;
    router.replace(
      catalogueHref(search, {
        page: 1,
        category: storefront.category === "All" ? null : storefront.category,
        collection: storefront.collection,
        conditions: [...storefront.conditions],
        inventories: [...storefront.inventories],
        inStock: storefront.inStock,
        maxPriceNaira: storefront.maxPrice ?? undefined,
        search: storefront.search,
        sort: storefront.sort as ParsedCatalogueSearch["sort"],
      }),
      { scroll: false },
    );
  }, [filtersReady, localFilterSignature]);

  const pageItems = productIds.flatMap((id) => {
    const product = storefront.productById(id);
    return product ? [product] : [];
  });

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

  const cardHandlers = {
    onQuickView: storefront.openQuick,
    onSave: storefront.toggleSaved,
    onAdd: (id: string) => {
      clientState.releaseProduct(id);
      storefront.addToCart(id);
    },
    onHold: (id: string) => {
      const product = storefront.productById(id);
      if (product && clientState.holdProduct(id)) {
        storefront.showToast(`${product.name} is held for 15 minutes.`);
      }
    },
    onRelease: clientState.releaseProduct,
  };
  const renderCards = (items: Product[]) =>
    items.map((product) => (
      <ProductCard
        {...cardHandlers}
        holdSeconds={clientState.holdSecondsByProduct[product.id] ?? null}
        isHeld={product.id in clientState.holdSecondsByProduct}
        isSaved={storefront.saved.has(product.id)}
        key={product.id}
        product={product}
      />
    ));

  const goToPage = (nextPage: number) => {
    router.push(catalogueHref(search, { page: nextPage }));
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
        </div>
      </section>

      <section className="shell catalogue-layout" id="products">
        {sidebarVisible ? (
          <aside className="catalogue-sidebar">
            <FilterControls />
          </aside>
        ) : null}
        <div className="catalogue-content">
          {pageItems.length > 0 ? (
            <div className={`product-grid ${density === "compact" ? "compact" : ""}`}>
              {renderCards(pageItems)}
            </div>
          ) : (
            <div className="empty-state">
              <h2>No pieces match these filters</h2>
              <p>Clear a filter or browse the full archive.</p>
              <Button onClick={storefront.clearFilters} type="button">
                Clear filters
              </Button>
            </div>
          )}

          {pageCount > 1 ? (
            <nav aria-label="Catalogue pages" className="pagination">
              <Button
                disabled={page <= 1}
                onClick={() => goToPage(page - 1)}
                type="button"
                variant="outline"
              >
                Previous
              </Button>
              <span className="mono">
                Page {page} of {pageCount}
              </span>
              <Button
                disabled={page >= pageCount}
                onClick={() => goToPage(page + 1)}
                type="button"
                variant="outline"
              >
                Next
              </Button>
            </nav>
          ) : null}
        </div>
      </section>
    </main>
  );
}

export function ProductCatalogue(props: Parameters<typeof CatalogueApp>[0]) {
  return <CatalogueApp {...props} />;
}
