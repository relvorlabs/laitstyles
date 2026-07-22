import { StarIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Badge } from "@/components/ui/badge";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Progress, ProgressLabel } from "@/components/ui/progress";
import type {
  PublicProductReview,
  PublicProductReviews,
} from "@/server/commerce/reviews/public-reviews";
import { reviewLifecycleMarkerCopy } from "../account/orders/order-state-copy";
import { productReviewAccessCopy, reviewDistributionRows } from "./product-detail-presentation";

const STAR_RATINGS = [1, 2, 3, 4, 5] as const;

const fitCopy: Record<NonNullable<PublicProductReview["fit"]>, string> = {
  runs_small: "Runs small",
  true_to_size: "True to size",
  runs_large: "Runs large",
  not_applicable: "Fit not applicable",
};

function reviewDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function ReviewCard({ review }: { review: PublicProductReview }) {
  const date = reviewDate(review.publishedAt);

  return (
    <article className="border-t border-border py-6 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex gap-1" role="img" aria-label={`${review.rating} out of 5 stars`}>
            {STAR_RATINGS.map((rating) => (
              <HugeiconsIcon
                aria-hidden="true"
                key={rating}
                icon={StarIcon}
                size={16}
                strokeWidth={1.6}
                fill={rating <= review.rating ? "currentColor" : "none"}
              />
            ))}
          </div>
          {review.title ? <h4 className="mt-3 text-lg font-semibold">{review.title}</h4> : null}
        </div>
        {date ? <time className="text-xs text-muted-foreground">{date}</time> : null}
      </div>

      {review.body ? (
        <p className="mt-4 max-w-3xl text-sm leading-7 text-foreground/80">{review.body}</p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{review.author}</span>
        <Badge variant="secondary">Verified purchase</Badge>
        {review.lifecycleMarker ? (
          <Badge variant="outline">{reviewLifecycleMarkerCopy(review.lifecycleMarker)}</Badge>
        ) : null}
        {review.fit ? <span>{fitCopy[review.fit]}</span> : null}
        {review.sizeOrdered ? <span>Size ordered: {review.sizeOrdered}</span> : null}
      </div>
    </article>
  );
}

export function ProductReviews({ reviews }: { reviews: PublicProductReviews }) {
  const summary = reviews.summary;
  const rows = reviewDistributionRows(summary);
  const hasReviews = summary.count > 0;

  return (
    <section
      id="reviews-section"
      className="mx-auto max-w-[1500px] scroll-mt-24 px-4 pb-14 sm:px-6 lg:px-8"
      aria-labelledby="reviews-title"
    >
      <div className="overflow-hidden rounded-sm border border-border bg-surface-panel">
        <div className="grid gap-6 bg-surface-inverse px-6 py-8 text-surface-inverse-foreground sm:px-9 sm:py-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.3em] opacity-50">
              Customer perspective
            </p>
            <h2 id="reviews-title" className="mt-3 font-serif text-4xl font-medium sm:text-5xl">
              Ratings & reviews
            </h2>
            <div className="mt-6 flex flex-wrap items-end gap-6">
              <span className="text-7xl font-semibold leading-none tabular-nums">
                {hasReviews ? summary.average.toFixed(1) : "—"}
              </span>
              <div className="pb-1">
                <div
                  className="flex gap-1"
                  aria-label={
                    hasReviews ? `${summary.average.toFixed(1)} out of 5 stars` : "Not yet rated"
                  }
                  role="img"
                >
                  {STAR_RATINGS.map((rating) => (
                    <HugeiconsIcon
                      aria-hidden="true"
                      key={rating}
                      icon={StarIcon}
                      size={18}
                      strokeWidth={1.5}
                      fill={rating <= Math.round(summary.average) ? "currentColor" : "none"}
                    />
                  ))}
                </div>
                <p className="mt-1 text-[10px] opacity-50">
                  {summary.count} verified {summary.count === 1 ? "review" : "reviews"}
                </p>
              </div>
            </div>
          </div>

          <p className="max-w-sm text-sm leading-6 opacity-70 lg:text-right">
            {productReviewAccessCopy}
          </p>
        </div>

        <div className="grid gap-7 p-6 sm:p-9 lg:grid-cols-[0.72fr_1.28fr]">
          <aside className="border-b border-border pb-7 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-8">
            <h3 className="text-sm font-semibold">Rating breakdown</h3>
            <div className="mt-5 space-y-3">
              {rows.map((row) => (
                <Progress
                  key={row.rating}
                  value={row.percentage}
                  className="grid grid-cols-[32px_1fr_42px] items-center gap-3 [&_[data-slot=progress-track]]:col-start-2 [&_[data-slot=progress-track]]:row-start-1"
                >
                  <ProgressLabel className="text-[10px]">{row.rating}★</ProgressLabel>
                  <span className="col-start-3 row-start-1 text-right text-[10px] tabular-nums">
                    {row.percentage}%
                  </span>
                </Progress>
              ))}
            </div>

            <p className="mt-7 border-t border-border pt-6 text-sm leading-6 text-muted-foreground">
              Ratings and fit feedback come only from delivered purchases.
            </p>
          </aside>

          <div>
            <div>
              <h3 className="text-lg font-semibold">What customers are saying</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Most recently published verified-purchase reviews appear first.
              </p>
            </div>

            {reviews.reviews.length > 0 ? (
              <div className="mt-6">
                {reviews.reviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            ) : (
              <Empty className="mt-6 min-h-64 border border-border bg-surface-sunken">
                <EmptyHeader>
                  <EmptyTitle>No reviews yet</EmptyTitle>
                  <EmptyDescription>
                    This product has no published verified-purchase reviews yet.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
