import { permanentRedirect } from "next/navigation";

// Legacy product URL. Canonical PDP is /products/[slug] (docs/storefront-v2/02).
// Preserve old/shared links with a permanent redirect.
export default async function LegacyProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  permanentRedirect(`/products/${slug}`);
}
