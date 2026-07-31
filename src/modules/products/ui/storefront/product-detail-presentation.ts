import type { ProductDetail, ProductVariantOption, ReviewSummary } from "@/lib/storefront/types";
import type { Product } from "./catalogue-data";
import { getProductDefaultImage } from "./product-media";

export interface ProductOptionPresentation {
  label: string;
  value: string;
  available: boolean;
}

export interface CampaignFramePresentation {
  id: string;
  eyebrow: string;
  headline: string;
  caption: string;
  image: string;
}

export interface ProductDetailPresentation {
  description: string;
  discountPercent: number | null;
  variants: readonly ProductVariantOption[];
  colours: readonly { name: string; hex: string | null }[];
  sizes: readonly ProductOptionPresentation[];
  measurements: ProductDetail["measurements"];
  reviewSummary: ReviewSummary;
  campaignFrames: readonly CampaignFramePresentation[];
}

export const productReviewAccessCopy =
  "Reviews can be written from delivered items in your order history.";

export function wrapCampaignIndex(value: number, frameCount: number) {
  if (frameCount <= 0) return 0;
  return (value + frameCount) % frameCount;
}

export function reviewDistributionRows(summary: ReviewSummary) {
  return ([5, 4, 3, 2, 1] as const).map((rating) => {
    const count = summary.distribution[rating];
    return {
      rating,
      count,
      percentage: summary.count > 0 ? Math.round((count / summary.count) * 100) : 0,
    };
  });
}

export function selectProductRecommendations(
  products: readonly Product[],
  current: Product,
): { styledWith: readonly Product[]; related: readonly Product[] } {
  const candidates = products.filter((candidate) => candidate.id !== current.id);
  const matching = candidates.filter(
    (candidate) => candidate.category === current.category || candidate.type === current.type,
  );
  const matchingIds = new Set(matching.map((candidate) => candidate.id));

  return {
    styledWith: matching.slice(0, 2),
    related: [
      ...matching,
      ...candidates.filter((candidate) => !matchingIds.has(candidate.id)),
    ].slice(0, 6),
  };
}

export function buildProductDetailPresentation(
  product: Product,
  detail: ProductDetail,
): ProductDetailPresentation {
  const variants = detail.mode === "variant" ? detail.variants : [];
  const defaultImage = getProductDefaultImage(product);
  const images = [
    defaultImage,
    ...detail.media
      .toSorted((left, right) => left.position - right.position)
      .map((item) => item.url),
    ...product.images,
  ].filter(
    (image, index, allImages): image is string =>
      Boolean(image) && allImages.indexOf(image) === index,
  );
  const discountPercent =
    product.referencePrice && product.referencePrice > product.price
      ? Math.round((1 - product.price / product.referencePrice) * 100)
      : null;
  const sizes =
    detail.mode === "variant"
      ? variants.map((variant) => ({
          label: variant.size ?? variant.label,
          value: variant.size ?? variant.label,
          available: variant.availability.available > 0,
        }))
      : [
          {
            label: product.size || "One size",
            value: product.size || "One size",
            available: product.status === "available",
          },
        ];
  const coloursByName = new Map<string, { name: string; hex: string | null }>();
  if (detail.mode === "variant") {
    for (const variant of variants) {
      if (variant.colour && !coloursByName.has(variant.colour)) {
        coloursByName.set(variant.colour, {
          name: variant.colour,
          hex: variant.colourHex,
        });
      }
    }
  } else if (detail.colour) {
    coloursByName.set(detail.colour, { name: detail.colour, hex: null });
  }
  const colours = [...coloursByName.values()];
  const frameHeadlines = [
    `${product.fit} form, without compromise.`,
    `${product.material} with presence.`,
    "Designed for considered movement.",
  ];
  const fallbackImage = images[0] ?? "";

  return {
    description:
      detail.description.trim() ||
      `${product.material} in a ${product.style.toLowerCase()} silhouette with a ${product.fit.toLowerCase()} fit.`,
    discountPercent,
    variants,
    colours:
      colours.length > 0 ? colours : [{ name: product.colour || "Not specified", hex: null }],
    sizes,
    measurements: [...detail.measurements].sort((left, right) => left.position - right.position),
    reviewSummary: detail.reviewSummary,
    campaignFrames: frameHeadlines.map((headline, index) => ({
      id: `frame-${index + 1}`,
      eyebrow: `Frame ${String(index + 1).padStart(2, "0")}`,
      headline,
      caption: ["Silhouette study", "Material study", "Movement study"][index] ?? "Campaign study",
      image: images[index % Math.max(images.length, 1)] ?? fallbackImage,
    })),
  };
}
