import "server-only";

import { type Prisma, prisma } from "@/lib/prisma";
import type { ReviewFit } from "@/modules/reviews/types";

const publicReviewSelect = {
  id: true,
  rating: true,
  title: true,
  body: true,
  fit: true,
  size_ordered: true,
  published_at: true,
  order_line: {
    select: {
      fulfilment_status: true,
      delivered_quantity: true,
      refund_status: true,
      orders: { select: { customer: { select: { name: true } } } },
      return_lines: {
        where: { return: { is: { status: "completed" } } },
        select: { quantity: true },
      },
    },
  },
} satisfies Prisma.product_reviewsSelect;

type PublicReviewRow = Prisma.product_reviewsGetPayload<{
  select: typeof publicReviewSelect;
}>;

export type PublicReviewLifecycleMarker = "returned" | "refunded";

export interface PublicProductReview {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  fit: ReviewFit | null;
  sizeOrdered: string | null;
  publishedAt: string | null;
  author: string;
  lifecycleMarker?: PublicReviewLifecycleMarker;
}

export interface PublicReviewSummary {
  average: number;
  count: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

export interface PublicProductReviews {
  reviews: PublicProductReview[];
  summary: PublicReviewSummary;
}

function authorLabel(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Verified customer";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts.at(-1)?.charAt(0).toUpperCase()}.`;
}

function lifecycleMarker(
  line: PublicReviewRow["order_line"],
): PublicReviewLifecycleMarker | undefined {
  const returnedQuantity = line.return_lines.reduce(
    (total, returned) => total + returned.quantity,
    0,
  );
  const fullyReturned =
    line.fulfilment_status === "returned" ||
    (line.delivered_quantity > 0 && returnedQuantity >= line.delivered_quantity);

  if (fullyReturned) return "returned";
  if (line.refund_status === "refunded") return "refunded";
  return undefined;
}

function mapReview(row: PublicReviewRow): PublicProductReview {
  const marker = lifecycleMarker(row.order_line);
  const review = {
    id: row.id,
    rating: row.rating,
    title: row.title,
    body: row.body,
    fit: row.fit,
    sizeOrdered: row.size_ordered,
    publishedAt: row.published_at?.toISOString() ?? null,
    author: authorLabel(row.order_line.orders.customer.name),
  } satisfies PublicProductReview;

  return marker ? { ...review, lifecycleMarker: marker } : review;
}

function summarize(reviews: PublicProductReview[]): PublicReviewSummary {
  const distribution: PublicReviewSummary["distribution"] = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  for (const review of reviews) {
    if (Number.isInteger(review.rating) && review.rating >= 1 && review.rating <= 5) {
      distribution[review.rating as 1 | 2 | 3 | 4 | 5] += 1;
    }
  }

  const count = Object.values(distribution).reduce((total, value) => total + value, 0);
  const total = (Object.entries(distribution) as Array<[string, number]>).reduce(
    (sum, [rating, value]) => sum + Number(rating) * value,
    0,
  );

  return {
    average: count === 0 ? 0 : total / count,
    count,
    distribution,
  };
}

export async function getPublicProductReviews(slug: string): Promise<PublicProductReviews> {
  const rows = await prisma.product_reviews.findMany({
    where: {
      status: "published",
      order_line: {
        products: {
          slug,
          lifecycle: "active",
          publication: "published",
        },
      },
    },
    orderBy: [{ published_at: "desc" }, { created_at: "desc" }],
    select: publicReviewSelect,
  });
  const reviews = rows.map(mapReview);
  return { reviews, summary: summarize(reviews) };
}
