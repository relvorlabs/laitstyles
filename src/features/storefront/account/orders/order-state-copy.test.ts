import { describe, expect, it } from "vitest";
import type { AccountLineReviewState } from "@/modules/orders/storefront/account-order-contract";
import {
  reviewLifecycleMarkerCopy,
  reviewStateCopy,
} from "@/modules/orders/storefront/order-state-copy";

describe("reviewStateCopy", () => {
  it.each([
    [
      { kind: "eligible", expiresAt: "2026-09-29T12:00:00.000Z" },
      "You can review this piece until 29 September 2026.",
    ],
    [{ kind: "pending", reviewId: "review-1" }, "Your review is awaiting moderation."],
    [{ kind: "published", reviewId: "review-1" }, "Your review is published."],
    [
      { kind: "published", reviewId: "review-1", lifecycleMarker: "returned" },
      "Your review is published. This item was later returned.",
    ],
    [
      { kind: "published", reviewId: "review-1", lifecycleMarker: "refunded" },
      "Your review is published. This item was later refunded.",
    ],
    [
      {
        kind: "rejected",
        reviewId: "review-1",
        reason: "Please remove personal information.",
        resubmission: { eligible: true, expiresAt: "2026-09-29T12:00:00.000Z" },
      },
      "Please revise your review: Please remove personal information.",
    ],
    [
      {
        kind: "rejected",
        reviewId: "review-1",
        reason: "Please remove personal information.",
        resubmission: { eligible: false, reason: "fully_refunded" },
      },
      "This review cannot be revised. Fully refunded items cannot be reviewed.",
    ],
    [
      {
        kind: "withdrawn",
        reviewId: "review-1",
        resubmission: { eligible: true, expiresAt: "2026-09-29T12:00:00.000Z" },
      },
      "You withdrew this review. You can submit it again.",
    ],
    [
      {
        kind: "withdrawn",
        reviewId: "review-1",
        resubmission: { eligible: false, reason: "fully_returned" },
      },
      "You withdrew this review. Fully returned items cannot be reviewed.",
    ],
    [
      { kind: "ineligible", reason: "order_line_not_found" },
      "This order item is not available for review.",
    ],
    [
      { kind: "ineligible", reason: "awaiting_delivery" },
      "You can review this piece after it is delivered.",
    ],
    [{ kind: "ineligible", reason: "cancelled" }, "Cancelled items cannot be reviewed."],
    [{ kind: "ineligible", reason: "fully_returned" }, "Fully returned items cannot be reviewed."],
    [{ kind: "ineligible", reason: "fully_refunded" }, "Fully refunded items cannot be reviewed."],
    [
      { kind: "ineligible", reason: "review_window_expired" },
      "The 90-day review window has closed.",
    ],
    [{ kind: "ineligible", reason: "already_reviewed" }, "This purchase already has a review."],
  ] satisfies ReadonlyArray<
    readonly [AccountLineReviewState, string]
  >)("returns customer-facing copy for %#", (state, expected) => {
    expect(reviewStateCopy(state, "en-GB")).toBe(expected);
  });
});

describe("reviewLifecycleMarkerCopy", () => {
  it("uses honest, non-punitive public labels", () => {
    expect(reviewLifecycleMarkerCopy("returned")).toBe("Item returned");
    expect(reviewLifecycleMarkerCopy("refunded")).toBe("Item refunded");
  });
});
