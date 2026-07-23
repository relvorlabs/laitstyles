import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProductDetail } from "@/features/storefront/product/product-detail";
import { formatNaira } from "@/lib/money";
import {
  getPublishedProductBySlug,
  listPublishedProducts,
  listPublishedProductSlugs,
} from "@/server/commerce/catalogue/catalog-repository";
import { getPublicProductReviews } from "@/server/commerce/reviews/public-reviews";
import ProductDetailLoading from "./loading";

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getPublishedProductBySlug(slug);
  if (!product) return { title: "Not found — Laitstyles" };

  const title = `${product.name} — Laitstyles`;
  const description = [
    product.material,
    product.condition,
    product.category?.name,
    formatNaira(product.price),
  ]
    .filter(Boolean)
    .join(" · ");
  const canonical = `/products/${product.slug}`;
  const image = product.media[0]?.url;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      images: image ? [{ url: image, alt: product.name }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default function ProductDetailPage({ params }: { params: Promise<Params> }) {
  return (
    <Suspense fallback={<ProductDetailLoading />}>
      <ProductDetailContent params={params} />
    </Suspense>
  );
}

async function ProductDetailContent({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const product = await getPublishedProductBySlug(slug);
  if (!product) notFound();

  const [reviews, recommendationCandidates] = await Promise.all([
    process.env.STOREFRONT_STYLE_SMOKE === "1"
      ? Promise.resolve({
          reviews: [],
          summary: { average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
        })
      : getPublicProductReviews(slug),
    listPublishedProducts({
      categoryId: product.category?.id,
      limit: 8,
    }),
  ]);
  const recommendations = recommendationCandidates.filter(
    (candidate) => candidate.id !== product.id,
  );

  const availability =
    product.availability.state === "sold_out"
      ? "https://schema.org/SoldOut"
      : product.availability.state === "reserved_by_others"
        ? "https://schema.org/PreOrder"
        : "https://schema.org/InStock";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.media.map((image) => image.url),
    description: product.description,
    sku: product.archiveNumber ?? product.id,
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    category: product.category?.name,
    offers: {
      "@type": "Offer",
      price: product.price / 100,
      priceCurrency: "NGN",
      availability,
      url: `/products/${product.slug}`,
      itemCondition: "https://schema.org/UsedCondition",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD is serialized and escapes `<`.
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <ProductDetail product={product} recommendations={recommendations} reviews={reviews} />
    </>
  );
}

function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export async function generateStaticParams() {
  const slugs = await listPublishedProductSlugs();
  return slugs.map((slug) => ({ slug }));
}
