import type { Metadata } from "next";
import Link from "next/link";
import { CatalogueResults } from "@/features/storefront/catalogue/catalogue-results";
import { FacetPanel } from "@/features/storefront/catalogue/facet-panel";
import {
  activeFacetCount,
  facetMutations,
  hasActiveFacets,
  PRICE_PRESETS,
  parseFacets,
  shopHref,
} from "@/features/storefront/catalogue/facets";
import { MobileFilters } from "@/features/storefront/catalogue/mobile-filters";
import {
  type CatalogueFilters,
  type CatalogueSort,
  countPublishedProducts,
  getStorefrontFacets,
  listPublishedProducts,
} from "@/server/commerce/catalogue/catalog-repository";

export const metadata: Metadata = {
  title: "Shop — Laitstyle",
  description:
    "Every piece is one-of-one — hand-picked, graded and photographed second-hand fashion.",
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const facets = parseFacets(await searchParams);
  const pricePreset = PRICE_PRESETS.find((preset) => preset.value === facets.price);

  const filters: CatalogueFilters = {
    search: facets.q,
    brands: facets.brands,
    conditions: facets.conditions,
    colours: facets.colours,
    sizes: facets.sizes,
    priceMinNaira: pricePreset?.minNaira,
    priceMaxNaira: pricePreset?.maxNaira,
  };

  const [options, products, total] = await Promise.all([
    getStorefrontFacets(),
    listPublishedProducts({ ...filters, sort: facets.sort, limit: 48 }),
    countPublishedProducts(filters),
  ]);

  const hrefForSort = (value: CatalogueSort) => shopHref(facets, facetMutations.sort(value));

  const chips: { label: string; href: string }[] = [
    ...facets.brands.map((value) => ({
      label: value,
      href: shopHref(facets, facetMutations.brand(value)),
    })),
    ...facets.conditions.map((value) => ({
      label: value,
      href: shopHref(facets, facetMutations.condition(value)),
    })),
    ...facets.sizes.map((value) => ({
      label: `Size ${value}`,
      href: shopHref(facets, facetMutations.size(value)),
    })),
    ...facets.colours.map((value) => ({
      label: value,
      href: shopHref(facets, facetMutations.colour(value)),
    })),
  ];
  if (pricePreset) {
    chips.push({
      label: pricePreset.label,
      href: shopHref(facets, facetMutations.price(pricePreset.value)),
    });
  }

  return (
    <main className="mx-auto w-full max-w-[1240px] flex-1 px-6 pb-16 max-sm:px-4">
      <div className="border-b border-border pb-6 pt-8">
        <p className="mb-2.5 text-[11.5px] font-semibold uppercase tracking-[0.2em] text-brand-sage-strong">
          {facets.q ? "Search results" : "Curated premium pre-owned & vintage"}
        </p>
        <h1 className="font-serif text-[38px] font-medium leading-[1.05] tracking-[-0.015em] max-sm:text-[30px]">
          {facets.q ? (
            <>
              Results for <em className="italic">“{facets.q}”</em>
            </>
          ) : (
            "Shop all"
          )}
          <span className="ml-3 align-middle text-[20px] font-normal text-muted-foreground tabular-nums">
            {total} {total === 1 ? "piece" : "pieces"}
          </span>
        </h1>
      </div>

      <div className="grid grid-cols-[248px_1fr] items-start gap-8 pt-6 max-md:grid-cols-1 max-md:gap-0">
        <aside className="sticky top-24 max-md:hidden">
          <FacetPanel facets={facets} options={options} />
        </aside>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <MobileFilters activeCount={activeFacetCount(facets)}>
              <FacetPanel facets={facets} options={options} />
            </MobileFilters>
            {hasActiveFacets(facets) ? (
              <div className="flex flex-wrap items-center gap-2">
                {chips.map((chip) => (
                  <Link
                    className="inline-flex items-center gap-1.5 rounded-full border border-chip-border bg-chip-bg px-3 py-1.5 text-[12.5px] text-surface-selected-foreground"
                    href={chip.href}
                    key={chip.label}
                    scroll={false}
                  >
                    {chip.label}
                    <span aria-hidden="true">×</span>
                  </Link>
                ))}
                <Link
                  className="text-[12.5px] text-muted-foreground underline underline-offset-2"
                  href={shopHref(facets, facetMutations.clearAll)}
                  scroll={false}
                >
                  Clear all
                </Link>
              </div>
            ) : null}
          </div>

          <CatalogueResults
            emptyAction={
              hasActiveFacets(facets) || facets.q ? (
                <Link
                  className="rounded-full bg-primary px-6 py-2.5 text-[13.5px] font-semibold text-primary-foreground"
                  href="/shop"
                >
                  Clear filters
                </Link>
              ) : null
            }
            emptyBody={
              facets.q
                ? "No pieces match that search. Try broader words, or browse the full collection."
                : "No pieces match those filters — try widening one, or browse everything."
            }
            emptyTitle={
              facets.q ? `No pieces match “${facets.q}”` : "No pieces match those filters"
            }
            hrefForSort={hrefForSort}
            products={products}
            sort={facets.sort}
            total={total}
          />
        </div>
      </div>
    </main>
  );
}
