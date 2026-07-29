import type { z } from "zod";
import type { ConsumerSession } from "@/modules/auth/server/session";
import type { createPaymentMethodSetupSchema } from "@/modules/payments/schema";

export type PaymentMethodIdentity = ConsumerSession;
export type CreatePaymentMethodSetupInput = z.infer<typeof createPaymentMethodSetupSchema>;

export type PaymentMethodStatus = "pending" | "active" | "challenged" | "inactive";
export type PaymentMethod = {
  id: string;
  brand: string | null;
  bank: string | null;
  last4: string | null;
  expMonth: string | null;
  expYear: string | null;
  channel: string | null;
  reusable: boolean;
  isDefault: boolean;
  status: PaymentMethodStatus;
  createdAt: string;
};

export type PaymentMethodSetup = {
  attemptId: string;
  paymentId: string;
  reference: string;
  accessCode: string | null;
  status: "initializing" | "initialized" | "pending" | "success" | "failed";
  refundStatus: "not_requested" | "pending" | "processing" | "needs_attention" | "processed" | "failed";
  method: PaymentMethod | null;
};

export type PaymentMethodErrorCode =
  | "PAYMENT_METHOD_INVALID"
  | "PAYMENT_METHOD_NOT_FOUND"
  | "PAYMENT_METHOD_SETUP_NOT_FOUND"
  | "PAYMENT_METHOD_SETUP_PENDING"
  | "PAYMENT_METHOD_SETUP_FAILED"
  | "PAYMENT_METHOD_NOT_REUSABLE"
  | "PAYMENT_METHOD_CUSTOMER_MISMATCH"
  | "PAYMENT_METHOD_AMOUNT_MISMATCH"
  | "PAYMENT_METHOD_CURRENCY_MISMATCH"
  | "PAYMENT_METHOD_PROVIDER_UNAVAILABLE";

export type PaymentMethodError = {
  code: PaymentMethodErrorCode;
  message: string;
  field?: string;
};
