import type { z } from "zod";
import type { ConsumerSession } from "@/modules/auth/server/session";
import type {
  createCheckoutRequestSchema,
  createCheckoutSchema,
  paystackSettlementEventSchema,
} from "@/modules/checkout/schema";

export type CheckoutIdentity = ConsumerSession;
export type CreateCheckoutRequestInput = z.infer<typeof createCheckoutRequestSchema>;
export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;
export type PaystackSettlementEvent = z.infer<typeof paystackSettlementEventSchema>;

export type CheckoutStatus =
  | "initializing"
  | "initialized"
  | "pending"
  | "success"
  | "failed"
  | "abandoned"
  | "reversed"
  | "review_required";

export type CheckoutDraft = {
  checkoutId: string;
  paymentId: string;
  orderNumber: string;
  reference: string;
  accessCode: string | null;
  status: CheckoutStatus;
  currency: string;
  subtotalMinor: number;
  deliveryFeeMinor: number;
  discountMinor: number;
  totalMinor: number;
};

export type CheckoutDetail = CheckoutDraft & {
  paidAt: string | null;
  lines: Array<{
    id: string;
    productId: string;
    variantId: string | null;
    productName: string;
    variantLabel: string | null;
    quantity: number;
    unitPriceMinor: number;
  }>;
};

export type PaymentSettlement = {
  checkoutId: string;
  paymentId: string;
  orderNumber: string;
  status: CheckoutStatus;
  replayed: boolean;
};

export type CheckoutErrorCode =
  | "CHECKOUT_INVALID"
  | "CHECKOUT_PRODUCT_UNAVAILABLE"
  | "CHECKOUT_VARIANT_INVALID"
  | "CHECKOUT_HOLD_EXPIRED"
  | "CHECKOUT_IDEMPOTENCY_CONFLICT"
  | "CHECKOUT_IN_PROGRESS"
  | "RESOURCE_NOT_OWNED"
  | "STOCK_NOT_AVAILABLE"
  | "PAYMENT_INITIALIZATION_FAILED"
  | "PAYMENT_NOT_FOUND"
  | "PAYMENT_AMOUNT_MISMATCH"
  | "PAYMENT_CURRENCY_MISMATCH"
  | "PAYMENT_CUSTOMER_MISMATCH"
  | "PAYMENT_REFERENCE_MISMATCH";

export type CheckoutError = {
  code: CheckoutErrorCode;
  message: string;
  field?: string;
  checkoutId?: string;
  paymentId?: string;
};
