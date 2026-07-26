import { addDays } from "date-fns";
import type {
  OrderLineFulfilmentStatus,
  ReviewEligibility,
  ReviewEligibilityInput,
  ReviewStatus,
} from "@/modules/reviews/types";

export const REVIEW_WINDOW_DAYS = 90;

const deliveredStatuses = new Set<OrderLineFulfilmentStatus>([
  "partially_delivered",
  "delivered",
  "partially_returned",
]);

const transitions: Readonly<Record<ReviewStatus, readonly ReviewStatus[]>> = {
  pending: ["withdrawn"],
  published: ["pending", "withdrawn"],
  rejected: ["pending", "withdrawn"],
  withdrawn: ["pending"],
};

export function getReviewEligibility(input: ReviewEligibilityInput, now: Date): ReviewEligibility {
  if (!input.owned) return { eligible: false, reason: "order_line_not_found" };
  if (input.fulfilmentStatus === "cancelled") {
    return { eligible: false, reason: "cancelled" };
  }
  if (
    (!deliveredStatuses.has(input.fulfilmentStatus) && input.fulfilmentStatus !== "returned") ||
    input.deliveredQuantity <= 0 ||
    input.deliveredAt === null
  ) {
    return { eligible: false, reason: "awaiting_delivery" };
  }
  if (
    input.fulfilmentStatus === "returned" ||
    input.completedReturnedQuantity >= input.deliveredQuantity
  ) {
    return { eligible: false, reason: "fully_returned" };
  }
  if (input.refundStatus === "refunded") {
    return { eligible: false, reason: "fully_refunded" };
  }
  if (input.hasReview) return { eligible: false, reason: "already_reviewed" };

  const expiresAt = addDays(input.deliveredAt, REVIEW_WINDOW_DAYS);
  if (now.getTime() > expiresAt.getTime()) {
    return { eligible: false, reason: "review_window_expired" };
  }
  return { eligible: true, expiresAt };
}

export function canTransitionReview(from: ReviewStatus, to: ReviewStatus): boolean {
  return transitions[from].includes(to);
}
