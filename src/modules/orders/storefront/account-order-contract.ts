import type { ReviewEligibilityReason } from "@/modules/reviews/types";

export type AccountPaymentStatusCode =
  | "pending"
  | "processing"
  | "paid"
  | "partially_refunded"
  | "refunded"
  | "review_required"
  | "cancelled";

export type AccountOrderFulfilmentStatusCode =
  | "unfulfilled"
  | "processing"
  | "ready_for_dispatch"
  | "dispatched"
  | "delivered"
  | "partially_returned"
  | "returned"
  | "cancelled";

export type AccountLineFulfilmentStatusCode =
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

export type AccountLineRefundStatusCode = "not_refunded" | "partially_refunded" | "refunded";

export interface AccountStatus<TCode extends string> {
  code: TCode;
  label: string;
}

export type AccountReviewResubmission =
  | { eligible: true; expiresAt: string }
  | { eligible: false; reason: ReviewEligibilityReason };

export type AccountLineReviewState =
  | { kind: "eligible"; expiresAt: string }
  | { kind: "pending"; reviewId: string }
  | { kind: "published"; reviewId: string; lifecycleMarker?: "returned" | "refunded" }
  | {
      kind: "rejected";
      reviewId: string;
      reason: string;
      resubmission: AccountReviewResubmission;
    }
  | { kind: "withdrawn"; reviewId: string; resubmission: AccountReviewResubmission }
  | { kind: "ineligible"; reason: ReviewEligibilityReason };

export interface AccountOrderImage {
  src: string;
  alt: string;
  width: number | null;
  height: number | null;
}

export interface AccountOrderLine {
  id: string;
  productName: string;
  productSlug: string | null;
  variantLabel: string | null;
  sku: string | null;
  image: AccountOrderImage | null;
  quantity: number;
  unitPriceKobo: number;
  lineTotalKobo: number;
  fulfilmentStatus: AccountStatus<AccountLineFulfilmentStatusCode>;
  deliveredQuantity: number;
  deliveredAt: string | null;
  cancelledQuantity: number;
  refundStatus: AccountStatus<AccountLineRefundStatusCode>;
  refundedAmountKobo: number;
  refundedAt: string | null;
  completedReturnedQuantity: number;
  reviewState: AccountLineReviewState;
}

export interface AccountOrderSummary {
  orderNumber: string;
  placedAt: string;
  updatedAt: string;
  currency: string;
  totalKobo: number;
  itemCount: number;
  itemNames: string[];
  images: AccountOrderImage[];
  reviewableItemCount: number;
  paymentStatus: AccountStatus<AccountPaymentStatusCode>;
  fulfilmentStatus: AccountStatus<AccountOrderFulfilmentStatusCode>;
}

export interface AccountDeliveryAddress {
  name: string | null;
  phone: string | null;
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
}

export interface AccountOrderTimelineEvent {
  status: string;
  occurredAt: string;
}

export interface AccountOrderDetail extends AccountOrderSummary {
  paymentMethod: string | null;
  fulfilmentMethod: "delivery" | "pickup";
  subtotalKobo: number;
  deliveryFeeKobo: number;
  discountAmountKobo: number;
  refundedAmountKobo: number;
  delivery: AccountDeliveryAddress | null;
  lines: AccountOrderLine[];
  timeline: AccountOrderTimelineEvent[];
}
