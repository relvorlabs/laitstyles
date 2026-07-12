import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AvailabilityLine } from "@/features/storefront/catalogue/product-card";
import { formatNaira } from "@/lib/money";
import { cn } from "@/lib/utils";
import { getPublishedProductBySlug } from "@/server/commerce/catalogue/catalog-repository";

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getPublishedProductBySlug(slug);
  if (!product) return { title: "Not found — Laitstyle" };
  return {
    title: `${product.name} — Laitstyle`,
    description: product.description.slice(0, 160),
  };
}

export default async function ProductPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const product = await getPublishedProductBySlug(slug);
  if (!product) notFound();

  const gallery = product.media.length ? product.media : product.cover ? [product.cover] : [];
  const hero = gallery[0];
  const discount = product.referencePrice
    ? Math.round((1 - product.price / product.referencePrice) * 100)
    : null;
  const isSold = product.availability.state === "sold_out";

  return (
    <main className="mx-auto w-full max-w-[1240px] flex-1 px-6 pb-20 max-sm:px-4">
      <nav className="flex items-center gap-2 py-5 text-[12.5px] text-muted-foreground">
        <Link className="hover:text-foreground" href="/">
          Home
        </Link>
        <span>/</span>
        <Link className="hover:text-foreground" href="/shop">
          Shop
        </Link>
        {product.category ? (
          <>
            <span>/</span>
            <span className="text-foreground">{product.category.name}</span>
          </>
        ) : null}
      </nav>

      <div className="flex flex-wrap gap-x-[52px] gap-y-8">
        {/* Gallery */}
        <div className="min-w-[300px] flex-[1_1_460px]">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[14px] bg-surface-sunken">
            {hero ? (
              <Image
                alt={hero.alt || product.name}
                className={cn("object-cover", isSold && "opacity-70 grayscale")}
                fill
                priority
                sizes="(min-width: 900px) 560px, 100vw"
                src={hero.url}
              />
            ) : null}
            {product.availability.isOneOfOne && !isSold ? (
              <span className="absolute left-4 top-4 rounded-full border border-chip-border bg-chip-bg px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.24em] text-surface-selected-foreground">
                The only one
              </span>
            ) : null}
          </div>
          {gallery.length > 1 ? (
            <div className="mt-3 flex gap-2.5">
              {gallery.slice(0, 4).map((image) => (
                <div
                  className="relative aspect-[4/5] flex-1 overflow-hidden rounded-[8px] border border-border bg-surface-sunken"
                  key={image.id}
                >
                  <Image
                    alt={image.alt || product.name}
                    className="object-cover"
                    fill
                    sizes="120px"
                    src={image.url}
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* Info */}
        <div className="min-w-[290px] flex-[1_1_380px]">
          <p className="mb-3 text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
            {[product.category?.name, product.brand].filter(Boolean).join(" · ")}
          </p>
          <h1 className="mb-4 text-balance font-serif text-[44px] font-medium italic leading-[1.04] tracking-[-0.015em] max-sm:text-[32px]">
            {product.name}
          </h1>

          <div className="mb-5 flex items-baseline gap-3 border-b border-border pb-5">
            <span className="font-serif text-[30px] font-medium tabular-nums">
              {formatNaira(product.price)}
            </span>
            {product.referencePrice ? (
              <span className="text-[15px] text-muted-foreground line-through tabular-nums">
                {formatNaira(product.referencePrice)}
              </span>
            ) : null}
            {discount ? (
              <span className="text-xs font-semibold text-brand-sage-strong">−{discount}%</span>
            ) : null}
          </div>

          <div className="mb-5 flex flex-wrap gap-2.5">
            {product.condition ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-chip-border bg-chip-bg px-4 py-2 text-[12.5px] font-semibold text-surface-selected-foreground">
                <span className="size-2 rounded-full bg-brand-sage" />
                {product.condition} condition
              </span>
            ) : null}
            {product.mode !== "variant" && (product.sizeLabel || product.colour) ? (
              <span className="inline-flex items-center rounded-full border border-border bg-control px-4 py-2 text-[12.5px] text-muted-foreground">
                {[product.sizeLabel, product.colour].filter(Boolean).join(" · ")}
              </span>
            ) : null}
          </div>

          <div className="mb-5">
            <AvailabilityLine availability={product.availability} />
          </div>

          {product.mode === "variant" ? (
            <div className="mb-6">
              <p className="mb-2 text-[12.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Sizes
              </p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((variant) => {
                  const disabled = variant.availability.state === "sold_out";
                  return (
                    <span
                      className={cn(
                        "inline-flex min-w-[48px] items-center justify-center rounded-[10px] border px-3 py-2 text-[13px]",
                        disabled
                          ? "border-border bg-surface-sunken text-muted-foreground line-through"
                          : "border-border-strong bg-control text-foreground",
                      )}
                      key={variant.id}
                    >
                      {variant.size ?? variant.label}
                    </span>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Reserving & checkout arrive with the cart release (Phase 5). */}
          <button
            className="h-[54px] w-full rounded-full bg-primary text-[15px] font-semibold text-primary-foreground disabled:opacity-50"
            disabled
            type="button"
          >
            {isSold ? "Rehomed" : "Reserve · opening soon"}
          </button>
          <p className="mt-2.5 text-center text-[12px] text-muted-foreground">
            Inspected, cleaned &amp; authenticated · 7-day returns
          </p>

          {product.description ? (
            <p className="mt-6 max-w-[460px] text-[14px] leading-[1.7] text-surface-panel-foreground/80">
              {product.description}
            </p>
          ) : null}
        </div>
      </div>

      {product.measurements.length ? (
        <section className="mt-14 border-t border-border pt-9">
          <h2 className="mb-5 text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
            Measured flat
          </h2>
          <div className="grid max-w-[520px] gap-0">
            {product.measurements.map((row) => (
              <div
                className="flex items-baseline justify-between gap-4 border-b border-border py-3"
                key={`${row.label}-${row.position}`}
              >
                <span className="text-sm text-muted-foreground">{row.label}</span>
                <span className="font-serif text-base tabular-nums">{row.value}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {product.reviewSummary.count > 0 ? (
        <section className="mt-14 border-t border-border pt-9">
          <h2 className="mb-2 font-serif text-[28px] font-medium italic">Notes from shoppers</h2>
          <p className="text-sm text-muted-foreground">
            <span className="font-serif text-[22px] text-foreground tabular-nums">
              {product.reviewSummary.average.toFixed(1)}
            </span>{" "}
            out of 5 · {product.reviewSummary.count}{" "}
            {product.reviewSummary.count === 1 ? "review" : "reviews"}
          </p>
        </section>
      ) : null}
    </main>
  );
}
