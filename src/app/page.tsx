import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ProductCard } from "@/features/storefront/catalogue/product-card";
import {
  listPublishedProducts,
  listStorefrontCategories,
} from "@/server/commerce/catalogue/catalog-repository";

export const metadata: Metadata = {
  title: "Laitstyle — one-of-one second-hand fashion from Lagos",
  description:
    "A living archive of one-of-one pieces — hand-picked, cleaned and graded. When one sells, it's gone for good.",
};

const trust = [
  {
    n: "01",
    title: "Every piece, the only one",
    body: "Each item is a single second-hand piece — hand-picked, cleaned and authenticated. When it sells, it's gone for good.",
  },
  {
    n: "02",
    title: "Honestly graded",
    body: "Inspected against a clear condition scale, with any flaws photographed close and disclosed before you buy.",
  },
  {
    n: "03",
    title: "Held while you decide",
    body: "Reserve a piece and it's held for you — no one else can take it while you check out. Delivered across Nigeria.",
  },
];

export default async function HomePage() {
  const [newIn, categories] = await Promise.all([
    listPublishedProducts({ limit: 8 }),
    listStorefrontCategories(),
  ]);
  const feature = newIn[0];

  return (
    <main className="mx-auto w-full max-w-[1240px] flex-1 px-6 pb-20 max-sm:px-4">
      {/* Hero */}
      <section className="flex flex-wrap items-stretch gap-9 py-9 max-sm:gap-6">
        <div className="flex min-w-[300px] flex-1 basis-[440px] flex-col justify-center">
          <p className="mb-4 text-[11.5px] font-semibold uppercase tracking-[0.22em] text-brand-sage-strong">
            Second-hand, first choice · Lagos
          </p>
          <h1 className="mb-4 font-serif text-[54px] font-medium leading-[1.02] tracking-[-0.02em] max-sm:text-[38px]">
            Someone loved it first.
            <br />
            <em className="font-normal italic">Now it&apos;s yours.</em>
          </h1>
          <p className="mb-7 max-w-[440px] text-[15px] leading-[1.65] text-muted-foreground">
            A living archive of one-of-one pieces — hand-picked, cleaned and graded. Every item is
            the only one. When it&apos;s gone, it&apos;s gone for good.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              className="flex h-[52px] items-center rounded-full bg-primary px-8 text-[14.5px] font-semibold text-primary-foreground transition-colors hover:bg-primary/86"
              href="/shop"
            >
              Shop the archive
            </Link>
          </div>
        </div>
        <div className="relative min-h-[420px] min-w-[300px] flex-1 basis-[440px] overflow-hidden rounded-[16px] bg-surface-sunken">
          {feature?.cover ? (
            <Link href={`/products/${feature.slug}`}>
              <Image
                alt={feature.cover.alt || feature.name}
                className="object-cover"
                fill
                priority
                sizes="(min-width: 900px) 50vw, 100vw"
                src={feature.cover.url}
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-brand-ink/70 to-transparent p-6 pt-16 text-brand-bone">
                <p className="text-[11px] uppercase tracking-[0.2em] text-brand-bone/75">Just in</p>
                <p className="mt-1 font-serif text-[22px] italic">{feature.name}</p>
              </div>
            </Link>
          ) : (
            <div className="grid h-full place-items-center p-8 text-center text-muted-foreground">
              The first drop lands soon.
            </div>
          )}
        </div>
      </section>

      {/* New in */}
      {newIn.length ? (
        <section className="pt-6">
          <div className="mb-5 flex items-end justify-between gap-4 border-b border-border pb-4">
            <div>
              <p className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-[0.2em] text-brand-sage-strong">
                Just in · one-of-one
              </p>
              <h2 className="font-serif text-[32px] font-medium leading-none max-sm:text-[26px]">
                New in
              </h2>
            </div>
            <Link
              className="whitespace-nowrap text-[13px] text-muted-foreground underline underline-offset-4 hover:text-foreground"
              href="/shop"
            >
              See all
            </Link>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-x-5 gap-y-9 max-sm:grid-cols-2 max-sm:gap-x-3.5">
            {newIn.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Shop by category */}
      {categories.length ? (
        <section className="pt-16">
          <h2 className="mb-5 font-serif text-[26px] font-medium">Shop by category</h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5">
            {categories.map((category) => (
              <Link
                className="flex items-center justify-between rounded-[14px] border border-border bg-surface-panel px-5 py-6 transition-colors hover:bg-surface-interactive"
                href="/shop"
                key={category.id}
              >
                <span className="font-serif text-[20px]">{category.name}</span>
                <span className="text-[12.5px] text-muted-foreground tabular-nums">
                  {category.productCount}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Trust / condition-grading */}
      <section className="mt-16 grid gap-8 rounded-[16px] bg-muted px-8 py-10 md:grid-cols-3">
        {trust.map((item) => (
          <div key={item.n}>
            <span className="font-serif text-[34px] font-medium text-brand-sage-strong tabular-nums">
              {item.n}
            </span>
            <h3 className="mt-2 text-[15px] font-semibold">{item.title}</h3>
            <p className="mt-1.5 text-[13px] leading-[1.6] text-muted-foreground">{item.body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
