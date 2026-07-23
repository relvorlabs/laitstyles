import { ArrowLeft01Icon, PackageDeliveredIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import {
  Eyebrow,
  panelClass,
  panelElevatedClass,
  StatusBadge,
} from "@/features/storefront/account/components/account-primitives";
import type { ReviewEligibilityReason, ReviewInput } from "@/lib/commerce/reviews/review-types";
import { cn } from "@/lib/utils";
import type { OwnedReviewContext } from "@/server/commerce/reviews/review-repository";

import { ReviewForm, type ReviewFormIntent } from "./review-form";

type FoundReviewContext = Extract<OwnedReviewContext, { found: true }>;

const ineligibleCopy: Record<ReviewEligibilityReason, string> = {
  order_line_not_found: "We could not find this item in your orders.",
  awaiting_delivery: "You can review this piece after it is delivered.",
  cancelled: "This piece was cancelled and cannot be reviewed.",
  fully_returned: "This piece was fully returned and can no longer be reviewed.",
  fully_refunded: "This piece was fully refunded and can no longer be reviewed.",
  review_window_expired: "The 90-day review window for this piece has ended.",
  already_reviewed: "A review already exists for this ordered piece.",
};

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(value);
}

function formDefaults(context: FoundReviewContext): Partial<ReviewInput> | undefined {
  if (!context.review) return undefined;
  return {
    rating: context.review.rating,
    title: context.review.title ?? undefined,
    body: context.review.body ?? "",
    fit: context.review.fit ?? "not_applicable",
  };
}

function intentFor(context: FoundReviewContext): ReviewFormIntent {
  if (!context.review) return "create";
  if (context.review.status === "published") return "edit";
  if (context.review.status === "rejected") return "revise";
  if (context.review.status === "withdrawn") return "resubmit";
  return "edit";
}

function statusTreatment(context: FoundReviewContext) {
  const review = context.review;
  if (!review) return null;
  if (review.status === "pending") {
    return {
      badge: "Pending moderation",
      title: "Your review is awaiting moderation",
      description: "It will appear on the product page after it has been approved.",
      destructive: false,
    };
  }
  if (review.status === "published") {
    return {
      badge: "Published",
      title: "Your review is live",
      description: "Changes will return it to moderation before they appear publicly.",
      destructive: false,
    };
  }
  if (review.status === "rejected") {
    return {
      badge: "Changes requested",
      title: "Your review needs changes",
      description:
        review.rejectionReason ??
        "Revise the review with more useful detail, then submit it again.",
      destructive: true,
    };
  }
  return {
    badge: "Withdrawn",
    title: "This review is withdrawn",
    description: "It is no longer visible on the product page.",
    destructive: false,
  };
}

function purchaseState(context: FoundReviewContext) {
  const eligibility = context.resubmissionEligibility;
  if (!eligibility.eligible) {
    if (eligibility.reason === "cancelled") {
      return { badge: "Cancelled item", variant: "danger" as const };
    }
    if (eligibility.reason === "awaiting_delivery") {
      return { badge: "Awaiting delivery", variant: "warning" as const };
    }
    if (eligibility.reason === "fully_returned") {
      return { badge: "Returned item", variant: "neutral" as const };
    }
    if (eligibility.reason === "fully_refunded") {
      return { badge: "Refunded item", variant: "neutral" as const };
    }
  }
  return { badge: "Delivered item", variant: "success" as const };
}

export function ReviewPage({
  context,
  orderNumber,
}: {
  context: FoundReviewContext;
  orderNumber: string;
}) {
  const orderPath = `/account/orders/${encodeURIComponent(orderNumber)}`;
  const treatment = statusTreatment(context);
  const purchase = purchaseState(context);
  const isNewReview = context.review === null;
  const submissionEligibility = isNewReview ? context.eligibility : context.resubmissionEligibility;
  const canSubmit = submissionEligibility.eligible && context.review?.status !== "pending";
  const allowWithdrawal = Boolean(context.review && context.review.status !== "withdrawn");
  const unavailableMessage = !submissionEligibility.eligible
    ? ineligibleCopy[submissionEligibility.reason]
    : context.review?.status === "pending"
      ? "Your submitted review cannot be edited while moderation is in progress."
      : undefined;

  return (
    <div className="mx-auto w-full max-w-4xl pb-12">
      <Link
        className={cn(buttonVariants({ variant: "link", size: "lg" }), "mb-5 px-0")}
        href={orderPath}
      >
        <HugeiconsIcon aria-hidden="true" icon={ArrowLeft01Icon} strokeWidth={1.8} />
        Back to order
      </Link>

      <header className="max-w-3xl">
        <Eyebrow className="text-[var(--acc-sage-deep)]">Verified purchase</Eyebrow>
        <h1 className="mt-4 text-balance font-serif text-[clamp(2.6rem,7vw,5rem)] font-normal leading-[.93]">
          {isNewReview ? "Review your piece" : "Your product review"}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--acc-muted)]">
          Share specific, honest details about the item. Eligible reviews are tied to the exact
          delivered order line and moderated before publication.
        </p>
      </header>

      <section className={cn("mt-7 p-5 sm:p-6", panelElevatedClass)}>
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[var(--acc-sage-soft)] text-[var(--acc-sage-deep)]">
            <HugeiconsIcon aria-hidden="true" icon={PackageDeliveredIcon} strokeWidth={1.7} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Eyebrow className="text-[var(--acc-muted)]">Order #{orderNumber}</Eyebrow>
                <h2 className="mt-2 break-words font-serif text-3xl font-normal">
                  {context.line.productName}
                </h2>
              </div>
              <StatusBadge variant={purchase.variant}>{purchase.badge}</StatusBadge>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--acc-muted)]">
              {[
                context.line.sizeOrdered,
                `Quantity ${context.line.purchasedQuantity}`,
                context.line.deliveredAt
                  ? `Delivered ${formatDate(context.line.deliveredAt)}`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <p className="mt-3 text-xs text-[var(--acc-muted)]">
              This review is privately linked to the purchase; your order number is not published.
            </p>
          </div>
        </div>
      </section>

      {treatment ? (
        <Alert className="mt-6 p-4" variant={treatment.destructive ? "destructive" : "default"}>
          <AlertTitle className="flex flex-wrap items-center gap-2">
            {treatment.title}
            <StatusBadge variant={treatment.destructive ? "danger" : "neutral"}>
              {treatment.badge}
            </StatusBadge>
          </AlertTitle>
          <AlertDescription>{treatment.description}</AlertDescription>
        </Alert>
      ) : null}

      {isNewReview && !submissionEligibility.eligible ? (
        <Alert className="mt-6 p-4">
          <AlertTitle>This item is not eligible for a review</AlertTitle>
          <AlertDescription>{ineligibleCopy[submissionEligibility.reason]}</AlertDescription>
        </Alert>
      ) : (
        <section className={cn("mt-6 p-5 sm:p-7", panelClass)}>
          <ReviewForm
            allowWithdrawal={allowWithdrawal}
            canSubmit={canSubmit}
            defaultValues={formDefaults(context)}
            intent={intentFor(context)}
            orderLineId={context.line.id}
            orderNumber={orderNumber}
            unavailableMessage={unavailableMessage}
          />
        </section>
      )}
    </div>
  );
}
