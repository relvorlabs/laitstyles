"use client";

import { PencilEdit01Icon, StarIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Progress, ProgressLabel } from "@/components/ui/progress";
import { useStorefront } from "@/features/storefront/shared/storefront-provider";
import type { ProductDetailPresentation } from "./product-detail-presentation";
import { reviewDistributionRows } from "./product-detail-presentation";

const STAR_RATINGS = [1, 2, 3, 4, 5] as const;

export function ProductReviews({ presentation }: { presentation: ProductDetailPresentation }) {
  const storefront = useStorefront();
  const summary = presentation.reviewSummary;
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

          <div>
            <Button
              type="button"
              className="min-h-14 w-full gap-2 bg-surface-panel px-7 text-[12px] font-bold text-surface-panel-foreground hover:bg-surface-interactive lg:w-auto"
              aria-describedby="review-submission-status"
              onClick={() =>
                storefront.showToast(
                  "Review submission is not available yet. Your feedback has not been saved.",
                )
              }
            >
              <HugeiconsIcon
                aria-hidden="true"
                icon={PencilEdit01Icon}
                size={16}
                strokeWidth={1.6}
              />
              Write a review
            </Button>
            <p
              id="review-submission-status"
              className="mt-2 max-w-xs text-[9px] leading-4 opacity-60"
            >
              Review submission is currently unavailable.
            </p>
          </div>
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

            <div className="mt-7 border-t border-border pt-6">
              <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Browse by topic
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {["Most helpful", "Fit", "Fabric", "Quality"].map((topic) => (
                  <Button
                    key={topic}
                    type="button"
                    disabled
                    className="min-h-10 rounded-full text-[10px]"
                    variant="outline"
                  >
                    {topic}
                  </Button>
                ))}
              </div>
              <p className="mt-3 text-[9px] text-muted-foreground">
                Topic filters will activate when individual review content is available.
              </p>
            </div>
          </aside>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">What customers are saying</h3>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Verified purchase feedback appears first when supplied by the catalogue.
                </p>
              </div>
              <label className="flex min-h-11 items-center gap-2 rounded-md border border-border bg-control px-3 text-[10px] font-semibold">
                Sort
                <select
                  disabled
                  className="bg-control text-control-foreground"
                  aria-label="Sort customer reviews"
                >
                  <option>Most helpful</option>
                </select>
              </label>
            </div>

            <Empty className="mt-6 min-h-64 border border-border bg-surface-sunken">
              <EmptyHeader>
                <EmptyTitle>
                  {hasReviews ? "Individual reviews are not available" : "No reviews yet"}
                </EmptyTitle>
                <EmptyDescription>
                  {hasReviews
                    ? "The aggregate rating above is available, but the current data source does not include review text or reviewer profiles."
                    : "This product has no verified review data yet. Nothing has been fabricated for this section."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </div>
        </div>
      </div>
    </section>
  );
}
