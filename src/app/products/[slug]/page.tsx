import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "@/features/storefront/home-lab/home-lab.css";
import {
  inventoryLabel,
  money,
  productBySlug,
  productSlug,
  products,
} from "@/features/storefront/home-lab/data";
import { labFontClassName } from "@/features/storefront/home-lab/fonts";
import { ProductDetailLab } from "@/features/storefront/home-lab/product-detail-lab";

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const product = productBySlug(slug);
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
  const product = productBySlug(slug);
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
      {/* JSON-LD structured data rendered as script children (no dangerouslySetInnerHTML). */}
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      <script type="application/ld+json">{JSON.stringify(breadcrumbLd)}</script>
      <ProductDetailLab product={product} fontClassName={labFontClassName} />
    </>
  );
}

// Pre-render all prototype product detail pages at build time.
export function generateStaticParams() {
  return products.map((p) => ({ slug: productSlug(p) }));
}
