import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ProductCard } from "@/features/storefront/catalogue/product-card";
import type { CategoryWithImage, ProductSummary } from "@/lib/storefront/types";
import { cn } from "@/lib/utils";

export function StorefrontHome({
  products,
  categories,
  total,
}: {
  products: readonly ProductSummary[];
  categories: readonly CategoryWithImage[];
  total: number;
}) {
  const available = products.filter((product) => product.availability.available > 0);
  const newArrivals = available.slice(0, 8);
  const oneOfOne = available.filter((product) => product.mode === "unique").slice(0, 4);
  const underTwentyFive = available.filter((product) => product.price <= 2_500_000).slice(0, 8);

  return (
    <main id="main">
      <section className="border-b border-[var(--line)] bg-[var(--bone)]">
        <div className="shell grid min-h-[620px] items-end gap-10 px-4 py-14 lg:grid-cols-[1.2fr_0.8fr] lg:py-20">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--muted)]">
              Curated in Lagos · Published from the live catalogue
            </p>
            <h1 className="mt-5 max-w-4xl font-serif text-6xl leading-[0.93] tracking-[-0.04em] sm:text-7xl lg:text-[96px]">
              Premium pre-owned pieces, clearly described.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--muted)]">
              Browse real availability, condition, sizing and product media from one canonical
              catalogue.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className={buttonVariants({ size: "lg", variant: "secondary" })} href="/products">
                Shop all pieces
              </Link>
              <Link
                className={buttonVariants({ size: "lg", variant: "outline" })}
                href="/products?mode=unique"
              >
                Explore one-of-one
              </Link>
            </div>
          </div>
          <div className="grid gap-4 border-l border-[var(--line)] pl-6">
            <p className="font-serif text-3xl">One catalogue. No duplicate product truth.</p>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div className="border-t border-[var(--line)] pt-4">
                <dt className="text-[var(--muted)]">Published pieces</dt>
                <dd className="mt-1 font-serif text-4xl">{total}</dd>
              </div>
              <div className="border-t border-[var(--line)] pt-4">
                <dt className="text-[var(--muted)]">Live categories</dt>
                <dd className="mt-1 font-serif text-4xl">{categories.length}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <ProductRail
        eyebrow="Freshly published"
        products={newArrivals}
        title="New arrivals"
        viewAllHref="/products?sort=newest"
      />

      {categories.length > 0 ? (
        <section className="border-y border-[var(--line)] bg-[var(--bone-2)] py-14">
          <div className="shell px-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
                  Browse by category
                </p>
                <h2 className="mt-2 font-serif text-5xl">Find your rail</h2>
              </div>
              <Link className="text-sm underline underline-offset-4" href="/products">
                View all
              </Link>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {categories.slice(0, 8).map((category) => (
                <Link
                  className="group relative min-h-72 overflow-hidden rounded-sm border border-[var(--line)] bg-[var(--linen)]"
                  href={`/products?category=${encodeURIComponent(category.slug)}`}
                  key={category.id}
                >
                  {category.imageUrl ? (
                    <Image
                      alt=""
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                      src={category.imageUrl}
                    />
                  ) : null}
                  <span className="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent" />
                  <span className="absolute inset-x-0 bottom-0 p-5 text-white">
                    <span className="block font-serif text-3xl">{category.name}</span>
                    <span className="mt-1 block text-xs opacity-75">
                      {category.productCount} {category.productCount === 1 ? "piece" : "pieces"}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <ProductRail
        eyebrow="Single-piece finds"
        products={oneOfOne}
        title="One-of-one edit"
        viewAllHref="/products?mode=unique"
      />
      <ProductRail
        eyebrow="Considered wardrobe buys"
        products={underTwentyFive}
        title="Under ₦25,000"
        viewAllHref="/products?max=25000"
      />
    </main>
  );
}

function ProductRail({
  eyebrow,
  products,
  title,
  viewAllHref,
}: {
  eyebrow: string;
  products: readonly ProductSummary[];
  title: string;
  viewAllHref: string;
}) {
  if (products.length === 0) return null;

  return (
    <section className="py-14">
      <div className="shell px-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
              {eyebrow}
            </p>
            <h2 className="mt-2 font-serif text-5xl">{title}</h2>
          </div>
          <Link
            className={cn(buttonVariants({ variant: "outline" }), "hidden sm:inline-flex")}
            href={viewAllHref}
          >
            View all
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
