export type OrderLineFulfilmentStatus =
  | "unfulfilled"
  | "processing"
  | "ready_for_dispatch"
  | "dispatched"
  | "partially_delivered"
  | "delivered"
  | "partially_cancelled"
  | "cancelled"
  | "partially_returned"
  | "returned";

export type OrderLineRefundStatus = "not_refunded" | "partially_refunded" | "refunded";

export type ReviewStatus = "pending" | "published" | "rejected" | "withdrawn";

export type ReviewFit = "runs_small" | "true_to_size" | "runs_large" | "not_applicable";

export interface ReviewEligibilityInput {
  owned: boolean;
  fulfilmentStatus: OrderLineFulfilmentStatus;
  deliveredQuantity: number;
  deliveredAt: Date | null;
  refundStatus: OrderLineRefundStatus;
  completedReturnedQuantity: number;
  purchasedQuantity: number;
  hasReview: boolean;
}

export type ReviewEligibilityReason =
  | "order_line_not_found"
  | "awaiting_delivery"
  | "cancelled"
  | "fully_returned"
  | "fully_refunded"
  | "review_window_expired"
  | "already_reviewed";

export type ReviewAccessFailureReason =
  | "authentication_required"
  | "customer_record_required"
  | ReviewEligibilityReason;

export type ReviewEligibility =
  | { eligible: true; expiresAt: Date }
  | { eligible: false; reason: ReviewEligibilityReason };

export type ReviewAccessFailure = {
  eligible: false;
  reason: ReviewAccessFailureReason;
};

export interface ReviewInput {
  rating: number;
  title?: string;
  body: string;
  fit: ReviewFit;
}

export type ReviewActionErrorCode =
  | "authentication-required"
  | "customer-profile-required"
  | "invalid-review-link"
  | "invalid-review-fields"
  | "withdrawal-failed"
  | ReviewEligibilityReason;

export type ReviewActionState =
  | { status: "idle" }
  | {
      status: "error";
      code: ReviewActionErrorCode;
      message: string;
      fieldErrors?: Partial<Record<keyof ReviewInput, string[]>>;
    };
