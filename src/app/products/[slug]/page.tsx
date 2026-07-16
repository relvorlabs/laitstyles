import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/features/storefront/product/product-detail";
import { inventoryLabel, money, productSlug } from "@/features/storefront/shared/catalogue-data";
import { storefrontFontClassName } from "@/features/storefront/shared/storefront-fonts";
import { loadStorefrontCatalog, loadStorefrontProductBySlug } from "@/lib/storefront/catalog-data";

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await loadStorefrontProductBySlug(slug);
  if (!product) return { title: "Not found — Laitstyles" };
  const title = `${product.name} — Laitstyles`;
  const description = `${product.material}. ${inventoryLabel(product.inventory)} · Grade ${product.condition} · ${money(product.price)}.`;
  const canonical = `/products/${productSlug(product)}`;
  const image = product.images[0];
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

export default async function ProductDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const product = await loadStorefrontProductBySlug(slug);
  if (!product) notFound();

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
    image: product.images,
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbLd) }}
      />
      <ProductDetail product={product} fontClassName={storefrontFontClassName} />
    </>
  );
}

function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

// Pre-render all prototype product detail pages at build time.
export async function generateStaticParams() {
  const catalog = await loadStorefrontCatalog();
  return catalog.products.map((product) => ({ slug: productSlug(product) }));
}
