import "server-only";

import { prisma } from "@/lib/prisma";

export type PendingPaymentMethodSetup = {
  idempotencyId: string;
  authorizationId: string;
  orderId: string;
  paymentId: string;
};

export async function failInitializedPaymentMethodSetup(pending: PendingPaymentMethodSetup) {
  const failedAt = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.payments.update({
      where: { id: pending.paymentId },
      data: {
        status: "failed",
        failure_reason: "Paystack setup initialization failed.",
      },
    });
    await tx.payment_authorizations.update({
      where: { id: pending.authorizationId },
      data: {
        signature: tombstonePaymentAuthorizationSignature(
          pending.authorizationId,
          `setup:${pending.authorizationId}`,
        ),
        status: "inactive",
        reusable: false,
        is_default: false,
        deactivated_at: failedAt,
      },
    });
    await tx.orders.update({
      where: { id: pending.orderId },
      data: {
        payment_status: "cancelled",
        fulfilment_status: "cancelled",
        attention: null,
      },
    });
    await tx.idempotency_records.update({
      where: { id: pending.idempotencyId },
      data: { status: "failed", completed_at: failedAt },
    });
  });
}

export async function failVerifiedPaymentMethodSetup(input: {
  authorizationId: string;
  authorizationSignature: string;
  orderId: string;
  paymentId: string;
  paymentStatus: "failed" | "abandoned";
}) {
  const failedAt = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.payments.update({
      where: { id: input.paymentId },
      data: {
        status: input.paymentStatus,
        verified_at: failedAt,
        verification_source: "manual_verify",
      },
    });
    await tx.payment_authorizations.update({
      where: { id: input.authorizationId },
      data: {
        signature: tombstonePaymentAuthorizationSignature(
          input.authorizationId,
          input.authorizationSignature,
        ),
        status: "inactive",
        reusable: false,
        is_default: false,
        deactivated_at: failedAt,
      },
    });
    await tx.orders.update({
      where: { id: input.orderId },
      data: {
        payment_status: "cancelled",
        fulfilment_status: "cancelled",
        attention: null,
      },
    });
  });
}

export function tombstonePaymentAuthorizationSignature(id: string, signature: string) {
  return `inactive:${id}:${signature}`;
}
