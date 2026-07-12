import type { Metadata } from "next";
import Link from "next/link";
import { CatalogueResults, parseSort } from "@/features/storefront/catalogue/catalogue-results";
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
  const sort = parseSort(params.sort);

  const [products, total] = await Promise.all([
    listPublishedProducts({ search, sort, limit: 48 }),
    countPublishedProducts({ search }),
  ]);

  const hrefForSort = (value: CatalogueSort) => {
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

      <CatalogueResults
        emptyAction={
          search ? (
            <Link
              className="rounded-full bg-primary px-6 py-2.5 text-[13.5px] font-semibold text-primary-foreground"
              href="/shop"
            >
              Browse everything
            </Link>
          ) : null
        }
        emptyBody={
          search
            ? "Every item is one-of-one, so a specific search can come up empty. Try broader words, or browse the full archive."
            : "We're grading and photographing the opening rail right now. Every piece is one-of-one — check back shortly."
        }
        emptyTitle={search ? `No pieces match “${search}”` : "The first drop lands soon"}
        hrefForSort={hrefForSort}
        products={products}
        sort={sort}
        total={total}
      />
    </main>
  );
}
