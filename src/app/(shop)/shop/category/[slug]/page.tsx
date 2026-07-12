import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogueResults, parseSort } from "@/features/storefront/catalogue/catalogue-results";
import {
  type CatalogueSort,
  countPublishedProducts,
  getStorefrontCategoryBySlug,
  listPublishedProducts,
} from "@/server/commerce/catalogue/catalog-repository";

type Params = { slug: string };
type SearchParams = { sort?: string | string[] };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const category = await getStorefrontCategoryBySlug(slug);
  if (!category) return { title: "Not found — Laitstyle" };
  return {
    title: `${category.name} — Laitstyle`,
    description: `Shop one-of-one ${category.name.toLowerCase()} — hand-picked, graded second-hand pieces.`,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { slug } = await params;
  const category = await getStorefrontCategoryBySlug(slug);
  if (!category) notFound();

  const sort = parseSort((await searchParams).sort);
  const [products, total] = await Promise.all([
    listPublishedProducts({ categoryId: category.id, sort, limit: 48 }),
    countPublishedProducts({ categoryId: category.id }),
  ]);

  const hrefForSort = (value: CatalogueSort) =>
    value === "newest" ? `/shop/category/${slug}` : `/shop/category/${slug}?sort=${value}`;

  return (
    <main className="mx-auto w-full max-w-[1240px] flex-1 px-6 pb-16 max-sm:px-4">
      <nav className="flex items-center gap-2 pt-6 text-[12.5px] text-muted-foreground">
        <Link className="hover:text-foreground" href="/shop">
          Shop
        </Link>
        <span>/</span>
        <span className="text-foreground">{category.name}</span>
      </nav>
      <div className="border-b border-border pb-6 pt-3">
        <p className="mb-2.5 text-[11.5px] font-semibold uppercase tracking-[0.2em] text-brand-sage-strong">
          Category · curated pre-owned & vintage
        </p>
        <h1 className="font-serif text-[38px] font-medium leading-[1.05] tracking-[-0.015em] max-sm:text-[30px]">
          {category.name}
          <span className="ml-3 align-middle text-[20px] font-normal text-muted-foreground tabular-nums">
            {total} {total === 1 ? "piece" : "pieces"}
          </span>
        </h1>
      </div>

      <CatalogueResults
        emptyAction={
          <Link
            className="rounded-full bg-primary px-6 py-2.5 text-[13.5px] font-semibold text-primary-foreground"
            href="/shop"
          >
            Browse everything
          </Link>
        }
        emptyBody="Nothing in this category is on the rail right now. Browse the full archive — every piece is one-of-one."
        emptyTitle={`No ${category.name.toLowerCase()} available yet`}
        hrefForSort={hrefForSort}
        products={products}
        sort={sort}
        total={total}
      />
    </main>
  );
}
