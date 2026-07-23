import type { ReactNode } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { ProductCard } from "@/features/storefront/catalogue/product-card";
import {
  catalogueHref,
  type ParsedCatalogueSearch,
} from "@/features/storefront/catalogue/catalogue-search-params";
import type {
  CategoryWithImage,
  ProductSummary,
  StorefrontFacetOptions,
} from "@/lib/storefront/types";
import { cn } from "@/lib/utils";

export function ProductCatalogue({
  products,
  total,
  page,
  pageCount,
  search,
  facets,
  categories,
}: {
  products: readonly ProductSummary[];
  total: number;
  page: number;
  pageCount: number;
  search: ParsedCatalogueSearch;
  facets: StorefrontFacetOptions;
  categories: readonly CategoryWithImage[];
}) {
  const activeFilters = [
    search.search
      ? { label: `Search: ${search.search}`, href: catalogueHref(search, { search: "", page: 1 }) }
      : null,
    search.category
      ? {
          label: `Category: ${search.category}`,
          href: catalogueHref(search, { category: null, page: 1 }),
        }
      : null,
    search.collection
      ? {
          label: `Collection: ${search.collection}`,
          href: catalogueHref(search, { collection: null, page: 1 }),
        }
      : null,
    ...search.brands.map((brand) => ({
      label: brand,
      href: catalogueHref(search, {
        brands: search.brands.filter((value) => value !== brand),
        page: 1,
      }),
    })),
    ...search.conditions.map((condition) => ({
      label: condition,
      href: catalogueHref(search, {
        conditions: search.conditions.filter((value) => value !== condition),
        page: 1,
      }),
    })),
    ...search.colours.map((colour) => ({
      label: colour,
      href: catalogueHref(search, {
        colours: search.colours.filter((value) => value !== colour),
        page: 1,
      }),
    })),
    ...search.sizes.map((size) => ({
      label: size,
      href: catalogueHref(search, {
        sizes: search.sizes.filter((value) => value !== size),
        page: 1,
      }),
    })),
    ...search.modes.map((mode) => ({
      label: mode,
      href: catalogueHref(search, {
        modes: search.modes.filter((value) => value !== mode),
        page: 1,
      }),
    })),
  ].filter((item): item is { label: string; href: string } => item !== null);

  return (
    <main className="lst-catalogue" id="main">
      <section className="border-b border-[var(--line)] bg-[var(--bone-2)]">
        <div className="shell px-4 py-12">
          <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-[var(--muted)]">
            Live Prisma catalogue
          </p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-5">
            <div>
              <h1 className="font-serif text-6xl">Shop all pieces</h1>
              <p className="mt-3 text-sm text-[var(--muted)]">
                {total} published {total === 1 ? "piece" : "pieces"} · page {page} of {pageCount}
              </p>
            </div>
            <Link className={buttonVariants({ variant: "outline" })} href="/products">
              Clear all
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--line)] bg-[var(--bone)]">
        <form action="/products" className="shell grid gap-4 px-4 py-6 lg:grid-cols-6" method="get">
          <label className="grid gap-1 lg:col-span-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
              Search
            </span>
            <input
              className="h-11 rounded-md border border-input bg-control px-3 text-sm"
              defaultValue={search.search}
              name="search"
              placeholder="Name, brand or description"
              type="search"
            />
          </label>
          <FilterSelect label="Category" name="category" value={search.category ?? ""}>
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Condition" name="condition" value={search.conditions[0] ?? ""}>
            <option value="">Any condition</option>
            {facets.conditions.map((condition) => (
              <option key={condition} value={condition}>
                {condition}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Inventory" name="mode" value={search.modes[0] ?? ""}>
            <option value="">All inventory</option>
            <option value="unique">One-of-one</option>
            <option value="stocked">Stocked</option>
            <option value="variant">Variants</option>
          </FilterSelect>
          <FilterSelect label="Sort" name="sort" value={search.sort}>
            <option value="newest">Newest</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
          </FilterSelect>
          <FilterSelect label="Brand" name="brand" value={search.brands[0] ?? ""}>
            <option value="">All brands</option>
            {facets.brands.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Colour" name="colour" value={search.colours[0] ?? ""}>
            <option value="">All colours</option>
            {facets.colours.map((colour) => (
              <option key={colour} value={colour}>
                {colour}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Size" name="size" value={search.sizes[0] ?? ""}>
            <option value="">All sizes</option>
            {facets.sizes.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </FilterSelect>
          <label className="grid gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
              Min price
            </span>
            <input
              className="h-11 rounded-md border border-input bg-control px-3 text-sm"
              defaultValue={search.minPriceNaira}
              min="0"
              name="min"
              placeholder="₦"
              type="number"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
              Max price
            </span>
            <input
              className="h-11 rounded-md border border-input bg-control px-3 text-sm"
              defaultValue={search.maxPriceNaira}
              min="0"
              name="max"
              placeholder="₦"
              type="number"
            />
          </label>
          <Button className="self-end" type="submit">
            Apply filters
          </Button>
        </form>

        {activeFilters.length > 0 ? (
          <div className="shell flex flex-wrap gap-2 px-4 pb-6" aria-label="Active filters">
            {activeFilters.map((filter) => (
              <Link
                className={buttonVariants({ size: "sm", variant: "secondary" })}
                href={filter.href}
                key={`${filter.label}-${filter.href}`}
              >
                {filter.label} ×
              </Link>
            ))}
          </div>
        ) : null}
      </section>

      <section className="shell px-4 py-10">
        {products.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="grid min-h-80 place-items-center border border-[var(--line)] bg-[var(--bone-2)] p-8 text-center">
            <div>
              <h2 className="font-serif text-4xl">No pieces match these filters.</h2>
              <p className="mt-3 text-sm text-[var(--muted)]">
                Remove a filter or return to the complete catalogue.
              </p>
              <Link className={cn(buttonVariants(), "mt-6")} href="/products">
                Clear filters
              </Link>
            </div>
          </div>
        )}

        {pageCount > 1 ? (
          <nav className="mt-10 flex flex-wrap justify-center gap-2" aria-label="Catalogue pages">
            <Link
              aria-disabled={page === 1}
              className={cn(
                buttonVariants({ variant: "outline" }),
                page === 1 && "pointer-events-none opacity-50",
              )}
              href={catalogueHref(search, { page: Math.max(1, page - 1) })}
            >
              Previous
            </Link>
            {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
              <Link
                aria-current={pageNumber === page ? "page" : undefined}
                className={buttonVariants({
                  variant: pageNumber === page ? "default" : "outline",
                })}
                href={catalogueHref(search, { page: pageNumber })}
                key={pageNumber}
              >
                {pageNumber}
              </Link>
            ))}
            <Link
              aria-disabled={page === pageCount}
              className={cn(
                buttonVariants({ variant: "outline" }),
                page === pageCount && "pointer-events-none opacity-50",
              )}
              href={catalogueHref(search, { page: Math.min(pageCount, page + 1) })}
            >
              Next
            </Link>
          </nav>
        ) : null}
      </section>
    </main>
  );
}

function FilterSelect({
  children,
  label,
  name,
  value,
}: {
  children: ReactNode;
  label: string;
  name: string;
  value: string;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
        {label}
      </span>
      <select
        className="h-11 rounded-md border border-input bg-control px-3 text-sm"
        defaultValue={value}
        name={name}
      >
        {children}
      </select>
    </label>
  );
}
