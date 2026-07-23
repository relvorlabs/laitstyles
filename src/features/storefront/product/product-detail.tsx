import Image from "next/image";
import Link from "next/link";
import { ProductCard } from "@/features/storefront/catalogue/product-card";
import { formatNaira } from "@/lib/money";
import type { ProductDetail as ProductDetailData, ProductSummary } from "@/lib/storefront/types";
import type { PublicProductReviews } from "@/server/commerce/reviews/public-reviews";
import { ProductCampaign } from "./product-campaign";
import { ProductPurchaseIsland } from "./product-purchase-island";
import { ProductReviews } from "./product-reviews";

export function ProductDetail({
  product,
  recommendations,
  reviews,
}: {
  product: ProductDetailData;
  recommendations: readonly ProductSummary[];
  reviews: PublicProductReviews;
}) {
  const media = [...product.media].sort((left, right) => left.position - right.position);
  const frames = media.slice(0, 3).map((image, index) => ({
    id: image.id,
    eyebrow: `Frame ${String(index + 1).padStart(2, "0")}`,
    headline: [
      `${product.fit ?? "Considered"} form, clearly shown.`,
      `${product.material ?? "Material"} with presence.`,
      "A closer look at the exact piece.",
    ][index] ?? "Product study",
    caption: ["Silhouette study", "Material study", "Detail study"][index] ?? "Product study",
    image: image.url,
  }));
  const styledWith = recommendations.slice(0, 2);
  const related = recommendations.slice(0, 6);

  return (
    <main className="lst-catalogue" id="main">
      <nav
        aria-label="Breadcrumb"
        className="mx-auto w-full max-w-[1500px] px-4 py-5 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground sm:px-6 lg:px-8"
      >
        <ol className="flex flex-wrap items-center gap-2">
          <li><Link href="/">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href="/products">Products</Link></li>
          {product.category ? (
            <>
              <li aria-hidden="true">/</li>
              <li>
                <Link href={`/products?category=${encodeURIComponent(product.category.slug)}`}>
                  {product.category.name}
                </Link>
              </li>
            </>
          ) : null}
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-foreground">{product.name}</li>
        </ol>
      </nav>

      <section className="mx-auto grid max-w-[1500px] gap-8 px-4 pb-14 sm:px-6 lg:grid-cols-[minmax(0,1.18fr)_minmax(360px,0.82fr)] lg:gap-12 lg:px-8">
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          {media.length > 0 ? (
            media.slice(0, 4).map((image, index) => (
              <div
                className={`relative min-h-[420px] overflow-hidden rounded-sm border border-border bg-surface-sunken ${index === 0 ? "sm:col-span-2 sm:min-h-[720px]" : ""}`}
                key={image.id}
              >
                <Image
                  alt={image.alt || `${product.name}, view ${index + 1}`}
                  className="object-cover"
                  fill
                  priority={index === 0}
                  sizes={index === 0 ? "(min-width: 1024px) 62vw, 100vw" : "(min-width: 1024px) 31vw, 50vw"}
                  src={image.url}
                />
              </div>
            ))
          ) : (
            <div className="grid min-h-[620px] place-items-center border border-border bg-surface-sunken text-muted-foreground sm:col-span-2">
              Product imagery is not available.
            </div>
          )}
        </div>
        <ProductPurchaseIsland product={product} />
      </section>

      <section className="mx-auto grid max-w-[1500px] gap-5 px-4 pb-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <article className="rounded-sm border border-border bg-surface-panel p-6 sm:p-8">
          <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-muted-foreground">Product information</p>
          <h2 className="mt-3 font-serif text-4xl">What is documented</h2>
          <p className="mt-5 text-sm leading-7 text-muted-foreground">{product.description}</p>
          <dl className="mt-7 grid gap-5 sm:grid-cols-2">
            <Detail label="Brand" value={product.brand ?? "Unbranded"} />
            <Detail label="Price" value={formatNaira(product.price)} />
            <Detail label="Material" value={product.material ?? "Not specified"} />
            <Detail label="Fit" value={product.fit ?? "Not specified"} />
            <Detail label="Style" value={product.style ?? "Not specified"} />
            <Detail label="Care" value={product.careInstructions ?? "Follow the garment label."} />
            {product.flawNotes ? <Detail label="Disclosed flaw" value={product.flawNotes} /> : null}
          </dl>
        </article>
        <RecommendationSection columns="styled" eyebrow="Styled with" products={styledWith} title="Complete the look" />
      </section>

      {frames.length > 0 ? <ProductCampaign frames={frames} /> : null}
      <MeasurementSection product={product} />
      <ProductReviews reviews={reviews} />
      <ServiceBenefits />
      <div className="mx-auto max-w-[1500px] px-4 py-14 sm:px-6 lg:px-8">
        <RecommendationSection columns="related" eyebrow="Continue the edit" products={related} title="You may also like" />
      </div>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-border pt-3">
      <dt className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{label}</dt>
      <dd className="mt-2 text-sm leading-6">{value}</dd>
    </div>
  );
}

function RecommendationSection({ columns, eyebrow, products, title }: { columns: "styled" | "related"; eyebrow: string; products: readonly ProductSummary[]; title: string }) {
  return (
    <section aria-labelledby={`${columns}-recommendations-title`} className={columns === "styled" ? "rounded-sm border border-border bg-surface-panel p-6" : ""}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-muted-foreground">{eyebrow}</p>
          <h2 className={`mt-2 font-serif ${columns === "styled" ? "text-3xl" : "text-4xl"}`} id={`${columns}-recommendations-title`}>{title}</h2>
        </div>
        <Link className="text-sm underline underline-offset-4" href="/products">View all</Link>
      </div>
      {products.length > 0 ? (
        <div className={columns === "styled" ? "mt-5 grid grid-cols-2 gap-3" : "mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6"}>
          {products.map((candidate) => <ProductCard key={candidate.id} product={candidate} />)}
        </div>
      ) : (
        <p className="mt-5 text-sm text-muted-foreground">More matching pieces will appear as the catalogue grows.</p>
      )}
    </section>
  );
}

function MeasurementSection({ product }: { product: ProductDetailData }) {
  const productMeasurements = product.measurements;
  const variantMeasurements = product.mode === "variant"
    ? product.variants
        .map((variant) => ({ ...variant, measurements: product.variantMeasurements?.[variant.id] ?? [] }))
        .filter((variant) => variant.measurements.length > 0)
    : [];

  if (productMeasurements.length === 0 && variantMeasurements.length === 0) return null;

  return (
    <section aria-labelledby="size-guide-title" className="mx-auto max-w-[1500px] px-4 py-14 sm:px-6 lg:px-8" id="size-guide">
      <div className="overflow-hidden rounded-sm border border-border bg-surface-panel">
        <div className="border-b border-border p-6 sm:p-8">
          <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-muted-foreground">Garment measurements</p>
          <h2 className="mt-2 font-serif text-4xl" id="size-guide-title">Size guide</h2>
        </div>
        <div className="grid gap-8 p-6 sm:p-8">
          {productMeasurements.length > 0 ? <MeasurementTable label={product.mode === "variant" ? "Product" : product.sizeLabel ?? "Product"} rows={productMeasurements} /> : null}
          {variantMeasurements.map((variant) => (
            <MeasurementTable key={variant.id} label={[variant.size, variant.colour].filter(Boolean).join(" · ") || variant.label} rows={variant.measurements} />
          ))}
        </div>
      </div>
    </section>
  );
}

function MeasurementTable({ label, rows }: { label: string; rows: readonly { label: string; value: string; position: number }[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{label}</h3>
      <dl className="mt-3 grid gap-0 sm:grid-cols-2 lg:grid-cols-4">
        {[...rows].sort((left, right) => left.position - right.position).map((measurement) => (
          <div className="border border-border p-4" key={`${label}-${measurement.label}`}>
            <dt className="text-xs text-muted-foreground">{measurement.label}</dt>
            <dd className="mt-1 font-medium">{measurement.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ServiceBenefits() {
  const items = [
    ["Delivery", "Timing confirmed at checkout"],
    ["Returns", "Eligibility shown before purchase"],
    ["Catalogue", "Availability read from PostgreSQL"],
    ["Support", "Account support remains available"],
  ] as const;

  return (
    <section aria-label="Service benefits" className="mx-auto grid max-w-[1500px] grid-cols-2 overflow-hidden border border-border bg-surface-panel md:grid-cols-4">
      {items.map(([title, body]) => (
        <div className="border border-border p-5" key={title}>
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{body}</p>
        </div>
      ))}
    </section>
  );
}
