import type { AccountLineReviewState } from "./account-order-contract";

type ReviewLifecycleMarker = "returned" | "refunded";

function assertNever(value: never): never {
  throw new Error(`Unhandled review state: ${JSON.stringify(value)}`);
}

function reviewDeadlineCopy(isoDate: string, locale: string): string {
  const formatted = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(isoDate));

  return `You can review this piece until ${formatted}.`;
}

function ineligibleReviewCopy(
  reason: Extract<AccountLineReviewState, { kind: "ineligible" }>["reason"],
): string {
  switch (reason) {
    case "order_line_not_found":
      return "This order item is not available for review.";
    case "awaiting_delivery":
      return "You can review this piece after it is delivered.";
    case "cancelled":
      return "Cancelled items cannot be reviewed.";
    case "fully_returned":
      return "Fully returned items cannot be reviewed.";
    case "fully_refunded":
      return "Fully refunded items cannot be reviewed.";
    case "review_window_expired":
      return "The 90-day review window has closed.";
    case "already_reviewed":
      return "This purchase already has a review.";
    default:
      return assertNever(reason);
  }
}

export function reviewLifecycleMarkerCopy(marker: ReviewLifecycleMarker): string {
  switch (marker) {
    case "returned":
      return "Item returned";
    case "refunded":
      return "Item refunded";
    default:
      return assertNever(marker);
  }
}

export function reviewStateCopy(state: AccountLineReviewState, locale = "en-NG"): string {
  switch (state.kind) {
    case "eligible":
      return reviewDeadlineCopy(state.expiresAt, locale);
    case "pending":
      return "Your review is awaiting moderation.";
    case "published":
      return state.lifecycleMarker
        ? `Your review is published. This item was later ${state.lifecycleMarker}.`
        : "Your review is published.";
    case "rejected":
      return state.resubmission.eligible
        ? `Please revise your review: ${state.reason}`
        : `This review cannot be revised. ${ineligibleReviewCopy(state.resubmission.reason)}`;
    case "withdrawn":
      return state.resubmission.eligible
        ? "You withdrew this review. You can submit it again."
        : `You withdrew this review. ${ineligibleReviewCopy(state.resubmission.reason)}`;
    case "ineligible":
      return ineligibleReviewCopy(state.reason);
    default:
      return assertNever(state);
  }
}
