import "server-only";

import type { Prisma } from "@/lib/prisma";
import type { PaystackSettlementEvent } from "@/modules/checkout/types";

export async function recordSuccessfulOrderPayment(
  tx: Prisma.TransactionClient,
  input: {
    orderId: string;
    paymentId: string;
    amountMinor: number;
    currency: string;
    event: PaystackSettlementEvent;
  },
) {
  const paidAt = input.event.paidAt ? new Date(input.event.paidAt) : new Date();
  await tx.orders.updateMany({
    where: { id: input.orderId, payment_status: { not: "paid" } },
    data: { payment_status: "paid", paid_at: paidAt, attention: null },
  });
  await tx.order_lines.updateMany({
    where: { order_id: input.orderId, stock_state: "reserved" },
    data: { stock_state: "committed" },
  });
  await tx.holds.updateMany({
    where: { order_id: input.orderId, status: "active" },
    data: {
      status: "converted",
      stage: "payment",
      payment_progress: "successful",
      converted_at: paidAt,
    },
  });
  await tx.order_payment_events.create({
    data: {
      order_id: input.orderId,
      payment_id: input.paymentId,
      kind: "succeeded",
      status: "success",
      amount: (input.amountMinor / 100).toFixed(2),
      currency: input.currency,
      method: "paystack",
      note: "Paystack payment verified and stock committed.",
      metadata: {
        reference: input.event.reference,
        providerTransactionId: input.event.providerTransactionId,
        source: input.event.source,
      },
    },
  });
  await tx.order_timeline_events.create({
    data: {
      order_id: input.orderId,
      status: "paid",
      note: "Payment confirmed by the server.",
      metadata: {
        paymentId: input.paymentId,
        reference: input.event.reference,
        source: input.event.source,
      },
    },
  });
  await tx.outbox_messages.create({
    data: {
      topic: "checkout.payment-settled",
      payload: {
        orderId: input.orderId,
        paymentId: input.paymentId,
        reference: input.event.reference,
      },
    },
  });
}
