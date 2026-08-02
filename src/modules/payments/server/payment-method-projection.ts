import "server-only";

import type { PaymentMethod, PaymentMethodSetup } from "@/modules/payments/types";

export type PaymentMethodProjectionRow = {
  id: string;
  bank: string | null;
  last4: string | null;
  exp_month: string | null;
  exp_year: string | null;
  country_code: string | null;
  channel: string | null;
  card_type: string | null;
  reusable: boolean;
  is_default: boolean;
  status: string;
  created_at: Date;
};

type PaymentMethodSetupPaymentRow = {
  id: string;
  reference: string;
  access_code: string | null;
  status: PaymentMethodSetup["status"];
  payment_refunds?: Array<{ status: string }>;
};

export function toPaymentMethod(method: PaymentMethodProjectionRow): PaymentMethod {
  return {
    id: method.id,
    brand: method.card_type,
    bank: method.bank,
    last4: method.last4,
    expMonth: method.exp_month,
    expYear: method.exp_year,
    countryCode: method.country_code,
    channel: method.channel,
    reusable: method.reusable,
    isDefault: method.is_default,
    status: method.status as PaymentMethod["status"],
    createdAt: method.created_at.toISOString(),
  };
}

export function toPaymentMethodSetup(
  authorization: PaymentMethodProjectionRow,
  payment: PaymentMethodSetupPaymentRow,
): PaymentMethodSetup {
  const refund = payment.payment_refunds?.[0];
  return {
    attemptId: authorization.id,
    paymentId: payment.id,
    reference: payment.reference,
    accessCode: payment.access_code,
    status: payment.status,
    refundStatus:
      (refund?.status as PaymentMethodSetup["refundStatus"] | undefined) ?? "not_requested",
    method: authorization.status === "active" ? toPaymentMethod(authorization) : null,
  };
}

export function mapPaymentMethodRefundStatus(
  status: string,
): "pending" | "processing" | "needs_attention" | "processed" | "failed" {
  switch (status) {
    case "processing":
      return "processing";
    case "processed":
      return "processed";
    case "failed":
      return "failed";
    case "needs-attention":
      return "needs_attention";
    default:
      return "pending";
  }
}
