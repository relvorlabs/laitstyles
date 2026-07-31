import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { reportPrerenderSafeServerError } from "@/lib/server-diagnostics";
import {
  loadStorefrontProductBySlug,
  loadStorefrontProductPageBySlug,
} from "@/modules/products/server/storefront/catalogue-loader";
import {
  inventoryLabel,
  money,
  productSlug,
} from "@/modules/products/ui/storefront/catalogue-data";
import { ProductDetail } from "@/modules/products/ui/storefront/product-detail";
import { getProductDefaultImage } from "@/modules/products/ui/storefront/product-media";
import { ProductRecentViewTracker } from "@/modules/products/ui/storefront/product-recent-view-tracker";
import { getPublicProductReviews } from "@/modules/reviews/server/public-product-reviews";
import { StorefrontDataUnavailable } from "@/modules/storefront-shell/ui/storefront-data-unavailable";
import { storefrontFontClassName } from "@/modules/storefront-shell/ui/storefront-fonts";
import ProductDetailLoading from "./loading";

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await loadStorefrontProductBySlug(slug);
    if (!product) return { title: "Not found — Laitstyles" };
    const title = `${product.name} — Laitstyles`;
    const description = `${product.material}. ${inventoryLabel(product.inventory)} · Grade ${product.condition} · ${money(product.price)}.`;
    const canonical = `/products/${productSlug(product)}`;
    const image = getProductDefaultImage(product);
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
  } catch (error: unknown) {
    reportProductPageFailure("metadata", error);
    return { title: "Laitstyles" };
  }
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
  let pageData: Awaited<ReturnType<typeof loadStorefrontProductPageBySlug>>;
  let reviews: Awaited<ReturnType<typeof getPublicProductReviews>>;

  try {
    [pageData, reviews] = await Promise.all([
      loadStorefrontProductPageBySlug(slug),
      getPublicProductReviews(slug),
    ]);
  } catch (error: unknown) {
    reportProductPageFailure("content", error);
    return <StorefrontDataUnavailable compact />;
  }

  if (!pageData) notFound();
  const { product, detail } = pageData;
  const defaultImage = getProductDefaultImage(product);
  const structuredImages = [defaultImage, ...product.images].filter(
    (image, index, allImages): image is string =>
      Boolean(image) && allImages.indexOf(image) === index,
  );

  const availability =
    product.status === "available"
      ? "https://schema.org/InStock"
      : product.status === "reserved"
        ? "https://schema.org/PreOrder"
        : "https://schema.org/SoldOut";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: structuredImages,
    description: `${product.material}. ${inventoryLabel(product.inventory)} · Grade ${product.condition}.`,
    sku: `LS-${product.id.toUpperCase()}`,
    brand: { "@type": "Brand", name: product.brand },
    category: product.category,
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "NGN",
      availability,
      url: `/products/${productSlug(product)}`,
      itemCondition: "https://schema.org/UsedCondition",
    },
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "/" },
      { "@type": "ListItem", position: 2, name: "Shop", item: "/products" },
      {
        "@type": "ListItem",
        position: 3,
        name: product.name,
        item: `/products/${productSlug(product)}`,
      },
    ],
  };

  return (
    <>
      <ProductRecentViewTracker productId={product.id} />
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD script text; serializeJsonLd escapes `<` so the payload cannot break out of the tag.
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: see above.
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbLd) }}
      />
      <ProductDetail
        detail={{ ...detail, reviewSummary: reviews.summary }}
        product={product}
        reviews={reviews}
        fontClassName={storefrontFontClassName}
      />
    </>
  );
}

function reportProductPageFailure(scope: "metadata" | "content", error: unknown): void {
  reportPrerenderSafeServerError("Storefront product read failed", {
    scope: `storefront-product-${scope}`,
    errorName: error instanceof Error ? error.name : typeof error,
  });
}

function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
