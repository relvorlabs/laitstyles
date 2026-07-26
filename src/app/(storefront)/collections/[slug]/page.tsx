import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CatalogueSort } from "@/lib/storefront/types";
import {
  countPublishedProducts,
  getStorefrontCollectionBySlug,
  listPublishedProducts,
} from "@/modules/products/server/storefront/queries";
import {
  CatalogueResults,
  parseSort,
} from "@/modules/products/ui/storefront/catalogue-results";

type Params = { slug: string };
type SearchParams = { sort?: string | string[] };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const collection = await getStorefrontCollectionBySlug(slug);
  if (!collection) return { title: "Not found — Laitstyle" };
  return {
    title: `${collection.name} — Laitstyle`,
    description: `${collection.name} — a curated edit of one-of-one pieces.`,
  };
}

export default async function CollectionPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const { slug } = await params;
  const collection = await getStorefrontCollectionBySlug(slug);
  if (!collection) notFound();

  const sort = parseSort((await searchParams).sort);
  const [products, total] = await Promise.all([
    listPublishedProducts({ collectionId: collection.id, sort, limit: 48 }),
    countPublishedProducts({ collectionId: collection.id }),
  ]);

  const hrefForSort = (value: CatalogueSort) =>
    value === "newest" ? `/collections/${slug}` : `/collections/${slug}?sort=${value}`;

  return (
    <main className="mx-auto w-full max-w-[1240px] flex-1 px-6 pb-16 max-sm:px-4">
      <nav className="flex items-center gap-2 pt-6 text-[12.5px] text-muted-foreground">
        <Link className="hover:text-foreground" href="/products">
          Shop
        </Link>
        <span>/</span>
        <span className="text-foreground">{collection.name}</span>
      </nav>
      <div className="border-b border-border pb-6 pt-3">
        <p className="mb-2.5 text-[11.5px] font-semibold uppercase tracking-[0.2em] text-brand-sage-strong">
          Collection · curated edit
        </p>
        <h1 className="font-serif text-[38px] font-medium italic leading-[1.05] tracking-[-0.015em] max-sm:text-[30px]">
          {collection.name}
          <span className="ml-3 align-middle text-[20px] font-normal not-italic text-muted-foreground tabular-nums">
            {total} {total === 1 ? "piece" : "pieces"}
          </span>
        </h1>
      </div>

      <CatalogueResults
        emptyAction={
          <Link
            className="rounded-full bg-primary px-6 py-2.5 text-[13.5px] font-semibold text-primary-foreground"
            href="/products"
          >
            Browse everything
          </Link>
        }
        emptyBody="This edit is empty right now. Browse the full archive — every piece is one-of-one."
        emptyTitle="Nothing in this edit yet"
        hrefForSort={hrefForSort}
        products={products}
        sort={sort}
        total={total}
      />
    </main>
  );
}
