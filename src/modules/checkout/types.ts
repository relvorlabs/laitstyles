import type { z } from "zod";
import type { ConsumerSession } from "@/modules/auth/server/session";
import type {
  checkoutDraftSchema,
  checkoutStatusSchema,
  createCheckoutRequestSchema,
  createCheckoutSchema,
  paystackSettlementEventSchema,
} from "@/modules/checkout/schema";
import type { OwnedAddress, OwnedProfile } from "@/modules/customers/types";

export type CheckoutIdentity = ConsumerSession;
export type CreateCheckoutRequestInput = z.infer<typeof createCheckoutRequestSchema>;
export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;
export type PaystackSettlementEvent = z.infer<typeof paystackSettlementEventSchema>;
export type CheckoutStatus = z.infer<typeof checkoutStatusSchema>;

export type CheckoutDeliveryZone = {
  id: string;
  name: string;
  city: string;
  feeMinor: number;
  estimatedDays: string | null;
};

export type CheckoutContext = {
  profile: OwnedProfile;
  profileComplete: boolean;
  addresses: OwnedAddress[];
  defaultAddressId: string | null;
  deliveryZones: CheckoutDeliveryZone[];
  selectedDeliveryZoneId: string | null;
  deliveryAmountStatus: "estimated";
};

export type CheckoutDraft = z.infer<typeof checkoutDraftSchema>;

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
