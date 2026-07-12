import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/features/storefront/catalogue/product-card";
import { cn } from "@/lib/utils";
import {
  type CatalogueSort,
  countPublishedProducts,
  listPublishedProducts,
} from "@/server/commerce/catalogue/catalog-repository";

export const metadata: Metadata = {
  title: "Shop — Laitstyle",
  description:
    "Every piece is one-of-one — hand-picked, graded and photographed second-hand fashion.",
};

const SORTS: { value: CatalogueSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

type ShopSearchParams = { q?: string | string[]; sort?: string | string[] };

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<ShopSearchParams>;
}) {
  const params = await searchParams;
  const search = firstValue(params.q)?.trim() || undefined;
  const sortParam = firstValue(params.sort);
  const sort: CatalogueSort =
    sortParam === "price_asc" || sortParam === "price_desc" ? sortParam : "newest";

  const [products, total] = await Promise.all([
    listPublishedProducts({ search, sort, limit: 48 }),
    countPublishedProducts({ search }),
  ]);

  const sortHref = (value: CatalogueSort) => {
    const qs = new URLSearchParams();
    if (search) qs.set("q", search);
    if (value !== "newest") qs.set("sort", value);
    const query = qs.toString();
    return query ? `/shop?${query}` : "/shop";
  };

  return (
    <main className="mx-auto w-full max-w-[1240px] flex-1 px-6 pb-16 max-sm:px-4">
      <div className="border-b border-border pb-6 pt-8">
        <p className="mb-2.5 text-[11.5px] font-semibold uppercase tracking-[0.2em] text-brand-sage-strong">
          {search ? "Search results" : "The archive · every piece one-of-one"}
        </p>
        <h1 className="font-serif text-[38px] font-medium leading-[1.05] tracking-[-0.015em] max-sm:text-[30px]">
          {search ? (
            <>
              Results for <em className="italic">“{search}”</em>
            </>
          ) : (
            "Shop the archive"
          )}
          <span className="ml-3 align-middle text-[20px] font-normal text-muted-foreground tabular-nums">
            {total} {total === 1 ? "piece" : "pieces"}
          </span>
        </h1>
      </div>

      {total > 0 ? (
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
                href={sortHref(option.value)}
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
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-[16px] border border-dashed border-chip-border bg-surface-panel px-6 py-20 text-center">
          <h2 className="font-serif text-[26px]">
            {search ? `No pieces match “${search}”` : "The first drop lands soon"}
          </h2>
          <p className="max-w-[420px] text-sm leading-relaxed text-muted-foreground">
            {search
              ? "Every item is one-of-one, so a specific search can come up empty. Try broader words, or browse the full archive."
              : "We're grading and photographing the opening rail right now. Every piece is one-of-one — check back shortly."}
          </p>
          {search ? (
            <Link
              className="rounded-full bg-primary px-6 py-2.5 text-[13.5px] font-semibold text-primary-foreground"
              href="/shop"
            >
              Browse everything
            </Link>
          ) : null}
        </div>
      )}
    </main>
  );
}
