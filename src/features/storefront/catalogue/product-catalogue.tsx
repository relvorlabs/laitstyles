"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  catalogueHref,
  type ParsedCatalogueSearch,
} from "@/features/storefront/catalogue/catalogue-search-params";
import { sortOptions } from "@/features/storefront/shared/catalogue-data";
import { FilterControls } from "@/features/storefront/shared/overlays/filter-controls";
import { ProductCard } from "@/features/storefront/shared/product-card";
import { IconClose, IconFilter, IconSort } from "@/features/storefront/shared/storefront-icons";
import { useStorefront } from "@/features/storefront/shared/storefront-provider";
import { cn } from "@/lib/utils";

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
  return (
    <div className={cn("lst-storefront flex min-h-screen flex-col", fontClassName)}>
      <CatalogueApp
        page={page}
        pageCount={pageCount}
        productIds={productIds}
        search={search}
        total={total}
      />
    </div>
  );
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
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [filtersReady, setFiltersReady] = useState(false);
  const lastAppliedFilterSignature = useRef(searchFilterSignature(search));
  const filterPanelId = "catalogue-filter-panel";

  const pageItems = productIds.flatMap((id) => {
    const product = storefront.productById(id);
    return product ? [product] : [];
  });
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);

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

  // The server signature contains every value read inside this synchronization
  // effect. Storefront setters are stable React state setters.
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

  // Local filter state is serialized only after the server state has hydrated.
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

  const applyQuick = (opts: { category?: string; collection?: string | null }) => {
    storefront.applyShop(opts);
    setFilterPanelOpen(false);
    storefront.closeAll();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetAll = () => storefront.clearFilters();

  const goToPage = (nextPage: number) => {
    router.push(catalogueHref(search, { page: nextPage }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <main id="main" className="lst-catalogue flex-1">
        <div className="mx-auto grid w-full max-w-[1500px] grid-cols-[minmax(0,0.85fr)_minmax(320px,1.15fr)] items-stretch gap-0 max-[980px]:grid-cols-1">
          <section className="flex min-h-[430px] flex-col justify-between border-r border-[var(--line)] bg-[var(--bone-2)] p-[clamp(28px,5vw,80px)] max-[980px]:min-h-[auto] max-[980px]:border-r-0 max-[980px]:border-b max-[980px]:border-[var(--line)]">
            <div>
              <p className="eyebrow">Browse the rack</p>
              <h1 className="mb-6 mt-4 max-w-[8ch] font-serif text-[clamp(4rem,9vw,8.6rem)] font-normal leading-[0.84] tracking-[-0.055em] text-[var(--ink)]">
                {storefront.title.title} <em className="font-normal text-[var(--oxblood)]">{storefront.title.em}</em>
              </h1>
              <p className="max-w-[520px] text-[0.94rem] leading-[1.8] text-[var(--muted)]">
                {storefront.title.description}
              </p>
            </div>
            <div className="mt-10 flex flex-wrap gap-2">
              <Button type="button" onClick={() => applyQuick({ collection: "new" })} variant="outline">
                New arrivals
              </Button>
              <Button type="button" onClick={() => applyQuick({ collection: "one-of-one" })} variant="outline">
                One-of-one
              </Button>
              <Button type="button" onClick={() => applyQuick({ collection: "under-25" })} variant="outline">
                Under ₦25k
              </Button>
              <Button type="button" onClick={() => applyQuick({ collection: "vintage" })} variant="outline">
                Vintage sportswear
              </Button>
            </div>
          </section>

          <section className="relative min-h-[430px] overflow-hidden bg-[var(--ink)] px-[clamp(28px,5vw,80px)] py-[clamp(36px,6vw,84px)] text-[var(--bone)]">
            <div className="absolute inset-0 opacity-[0.12] [background:radial-gradient(circle_at_30%_20%,var(--sage)_0,transparent_38%),radial-gradient(circle_at_76%_72%,var(--oxblood)_0,transparent_42%)]" />
            <div className="relative z-10 flex h-full flex-col justify-between gap-10">
              <p className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-[var(--sage-light)]">Laitstyles catalogue</p>
              <div>
                <p className="mb-4 max-w-[22ch] font-serif text-[clamp(2rem,4vw,4.6rem)] leading-[0.96] tracking-[-0.03em]">
                  Clothes with character, presented with evidence.
                </p>
                <p className="max-w-[480px] text-[0.88rem] leading-[1.75] text-[color-mix(in_srgb,var(--bone)_70%,transparent)]">
                  Every listing carries clear condition notes, measurements, inventory status and the details you need before checkout.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-6 border-t border-[color-mix(in_srgb,var(--bone)_18%,transparent)] pt-5 text-[0.78rem] max-[560px]:grid-cols-1">
                <div>
                  <strong className="block font-serif text-[1.5rem] font-normal">{total}</strong>
                  <span className="text-[color-mix(in_srgb,var(--bone)_66%,transparent)]">matching pieces</span>
                </div>
                <div>
                  <strong className="block font-serif text-[1.5rem] font-normal">3</strong>
                  <span className="text-[color-mix(in_srgb,var(--bone)_66%,transparent)]">stock modes</span>
                </div>
                <div>
                  <strong className="block font-serif text-[1.5rem] font-normal">NG</strong>
                  <span className="text-[color-mix(in_srgb,var(--bone)_66%,transparent)]">nationwide delivery</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="border-y border-[var(--line)] bg-[var(--bone)]">
          <div className="shell flex min-h-[66px] items-center justify-between gap-4 max-[760px]:flex-col max-[760px]:items-stretch max-[760px]:py-3">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                aria-controls={filterPanelId}
                aria-expanded={filterPanelOpen}
                onClick={() => setFilterPanelOpen((open) => !open)}
                type="button"
                variant="outline"
              >
                <IconFilter /> Filters
                {storefront.activeFilterChips.length > 0 ? (
                  <span className="rounded-full bg-[var(--ink)] px-2 py-0.5 text-[0.66rem] text-[var(--bone)]">
                    {storefront.activeFilterChips.length}
                  </span>
                ) : null}
              </Button>
              <p className="truncate text-[0.82rem] text-[var(--muted)]">
                {total} {total === 1 ? "piece" : "pieces"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => storefront.open("sortModal")} type="button" variant="outline">
                <IconSort /> {sortOptions.find(([value]) => value === storefront.sort)?.[1] ?? "Sort"}
              </Button>
            </div>
          </div>

          {storefront.activeFilterChips.length > 0 ? (
            <div className="shell flex flex-wrap items-center gap-2 pb-4">
              {storefront.activeFilterChips.map((chip) => (
                <Button
                  key={`${chip.type}-${chip.value ?? chip.label}`}
                  onClick={() => storefront.removeFilter(chip.type, chip.value)}
                  size="sm"
                  type="button"
                  variant="secondary"
                >
                  {chip.label} <IconClose />
                </Button>
              ))}
              <Button onClick={resetAll} size="sm" type="button" variant="ghost">
                Clear all
              </Button>
            </div>
          ) : null}
        </section>

        <div className="shell grid grid-cols-[280px_minmax(0,1fr)] gap-8 py-10 max-[960px]:grid-cols-1">
          <aside
            className={cn(
              "self-start border border-[var(--line)] bg-[var(--bone-2)] p-5 max-[960px]:hidden",
              filterPanelOpen && "max-[960px]:block",
            )}
            id={filterPanelId}
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow">Refine</p>
                <h2 className="mt-1 font-serif text-[2rem] font-normal">Filters</h2>
              </div>
              <Button
                aria-label="Close filters"
                className="min-[961px]:hidden"
                onClick={() => setFilterPanelOpen(false)}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <IconClose />
              </Button>
            </div>
            <FilterControls />
          </aside>

          <div className="min-w-0">
            {pageItems.length ? (
              <div className="grid grid-cols-3 gap-x-4 gap-y-8 max-[1120px]:grid-cols-2 max-[620px]:grid-cols-1">
                {pageItems.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="grid min-h-[380px] place-items-center border border-[var(--line)] bg-[var(--bone-2)] p-8 text-center">
                <div>
                  <p className="eyebrow">No match</p>
                  <h2 className="mt-2 font-serif text-[clamp(2.4rem,5vw,4.5rem)] font-normal leading-none">
                    Nothing fits those filters.
                  </h2>
                  <p className="mx-auto mt-4 max-w-[420px] text-[0.9rem] leading-[1.75] text-[var(--muted)]">
                    Remove one filter or return to the complete catalogue.
                  </p>
                  <Button className="mt-6" onClick={resetAll} type="button">
                    Clear filters
                  </Button>
                </div>
              </div>
            )}

            {pageCount > 1 ? (
              <nav aria-label="Catalogue pages" className="mt-10 flex flex-wrap justify-center gap-2">
                <Button
                  disabled={page === 1}
                  onClick={() => goToPage(Math.max(1, page - 1))}
                  type="button"
                  variant="outline"
                >
                  Previous
                </Button>
                {pages.map((pageNumber) => (
                  <Button
                    aria-current={pageNumber === page ? "page" : undefined}
                    key={pageNumber}
                    onClick={() => goToPage(pageNumber)}
                    type="button"
                    variant={pageNumber === page ? "default" : "outline"}
                  >
                    {pageNumber}
                  </Button>
                ))}
                <Button
                  disabled={page === pageCount}
                  onClick={() => goToPage(Math.min(pageCount, page + 1))}
                  type="button"
                  variant="outline"
                >
                  Next
                </Button>
              </nav>
            ) : null}
          </div>
        </div>
      </main>
    </>
  );
}
