import Link from "next/link";
import type { ReactNode } from "react";
import { ProductCard } from "@/features/storefront/catalogue/product-card";
import type { ProductSummary } from "@/lib/storefront/types";
import { cn } from "@/lib/utils";
import type { CatalogueSort } from "@/server/commerce/catalogue/catalog-repository";

const SORTS: { value: CatalogueSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

// Shared listing body (sort chips + grid + designed empty state) used by /shop,
// category and collection landings — one contract, no per-surface duplicates.
export function CatalogueResults({
  products,
  total,
  sort,
  hrefForSort,
  emptyTitle,
  emptyBody,
  emptyAction,
}: {
  products: ProductSummary[];
  total: number;
  sort: CatalogueSort;
  hrefForSort: (sort: CatalogueSort) => string;
  emptyTitle: string;
  emptyBody: string;
  emptyAction?: ReactNode;
}) {
  if (total === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-[16px] border border-dashed border-chip-border bg-surface-panel px-6 py-20 text-center">
        <h2 className="font-serif text-[26px]">{emptyTitle}</h2>
        <p className="max-w-[420px] text-sm leading-relaxed text-muted-foreground">{emptyBody}</p>
        {emptyAction}
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 py-5">
        <span className="mr-1 text-[12.5px] text-muted-foreground">Sort</span>
        {SORTS.map((option) => (
          <Link
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-[12.5px] transition-colors",
              option.value === sort
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-control text-muted-foreground hover:bg-control-hover",
            )}
            href={hrefForSort(option.value)}
            key={option.value}
          >
            {option.label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-x-5 gap-y-9 max-sm:grid-cols-2 max-sm:gap-x-3.5">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </>
  );
}

type SortParam = string | string[] | undefined;

/** Parse a `?sort=` value into a valid CatalogueSort (default: newest). */
export function parseSort(value: SortParam): CatalogueSort {
  const v = Array.isArray(value) ? value[0] : value;
  return v === "price_asc" || v === "price_desc" ? v : "newest";
}
