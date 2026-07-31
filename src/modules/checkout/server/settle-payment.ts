import "server-only";

import { err, ok, type Result } from "@/lib/errors";
import type { Prisma } from "@/lib/prisma";
import { prisma } from "@/lib/prisma";
import { paystackSettlementEventSchema } from "@/modules/checkout/schema";
import type {
  CheckoutError,
  CheckoutStatus,
  PaymentSettlement,
  PaystackSettlementEvent,
} from "@/modules/checkout/types";
import { applyOperationalStockMutation } from "@/modules/inventory/server/operational-stock";
import { recordSuccessfulOrderPayment } from "@/modules/orders/server/payment-settlement";

const MAX_SERIALIZABLE_ATTEMPTS = 3;

export async function settlePaystackEvent(
  input: PaystackSettlementEvent,
): Promise<Result<PaymentSettlement, CheckoutError>> {
  const parsed = paystackSettlementEventSchema.safeParse(input);
  if (!parsed.success) {
    return err({ code: "CHECKOUT_INVALID", message: "Paystack settlement event is invalid." });
  }

  for (let attempt = 0; attempt < MAX_SERIALIZABLE_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const payment = await tx.payments.findUnique({
            where: { reference: parsed.data.reference },
            include: {
              orders: { include: { order_lines: true, holds: true } },
            },
          });
          if (!payment) {
            return err({ code: "PAYMENT_NOT_FOUND", message: "Payment reference was not found." });
          }
          const order = payment.orders;
          if (payment.status === "success" && order.payment_status === "paid") {
            return ok(replay(payment.id, order.id, order.order_number, "success"));
          }

          const expectedAmountMinor = decimalToMinor(payment.amount);
          if (parsed.data.amountMinor !== expectedAmountMinor) {
            await flagForReview(tx, payment.id, order.id, "PAYMENT_AMOUNT_MISMATCH", parsed.data);
            return err({
              code: "PAYMENT_AMOUNT_MISMATCH",
              message: "Paystack amount does not match the recorded checkout total.",
              checkoutId: order.id,
              paymentId: payment.id,
            });
          }
          if (parsed.data.currency !== payment.currency.toUpperCase()) {
            await flagForReview(tx, payment.id, order.id, "PAYMENT_CURRENCY_MISMATCH", parsed.data);
            return err({
              code: "PAYMENT_CURRENCY_MISMATCH",
              message: "Paystack currency does not match the recorded checkout currency.",
              checkoutId: order.id,
              paymentId: payment.id,
            });
          }
          if (
            parsed.data.customerEmail &&
            order.customer_email &&
            parsed.data.customerEmail.toLowerCase() !== order.customer_email.toLowerCase()
          ) {
            await flagForReview(tx, payment.id, order.id, "PAYMENT_CUSTOMER_MISMATCH", parsed.data);
            return err({
              code: "PAYMENT_CUSTOMER_MISMATCH",
              message: "Paystack customer does not match the recorded checkout customer.",
              checkoutId: order.id,
              paymentId: payment.id,
            });
          }

          const claimed = await tx.payments.updateMany({
            where: { id: payment.id, status: { not: parsed.data.status } },
            data: {
              status: parsed.data.status,
              provider_transaction_id: parsed.data.providerTransactionId,
              channel: parsed.data.channel,
              gateway_response: parsed.data.gatewayResponse,
              verified_at: new Date(),
              verification_source: parsed.data.source,
              failure_code: parsed.data.failureCode,
              failure_reason: parsed.data.failureReason,
              paid_at:
                parsed.data.status === "success"
                  ? parsed.data.paidAt
                    ? new Date(parsed.data.paidAt)
                    : new Date()
                  : null,
            },
          });
          if (claimed.count !== 1) {
            return ok(replay(payment.id, order.id, order.order_number, parsed.data.status));
          }

          if (parsed.data.status !== "success") {
            await recordUnsuccessfulPayment(tx, payment.id, order.id, parsed.data);
            return ok({
              checkoutId: order.id,
              paymentId: payment.id,
              orderNumber: order.order_number,
              status: parsed.data.status,
              replayed: false,
            });
          }

          for (const line of order.order_lines) {
            if (line.stock_state !== "reserved") continue;
            const relatedHold = order.holds.find(
              (hold) =>
                hold.status === "active" &&
                hold.product_id === line.product_id &&
                hold.variant_id === line.variant_id,
            );
            await applyOperationalStockMutation(tx, {
              productId: line.product_id,
              ...(line.variant_id ? { variantId: line.variant_id } : {}),
              quantity: line.quantity,
              kind: "commit-reserved",
              note: `Committed after verified payment for ${order.order_number}.`,
              relatedOrderId: order.id,
              ...(relatedHold ? { relatedHoldId: relatedHold.id } : {}),
              metadata: {
                operation: "checkout-settlement",
                paymentId: payment.id,
                reference: parsed.data.reference,
              },
            });
          }
          await recordSuccessfulOrderPayment(tx, {
            orderId: order.id,
            paymentId: payment.id,
            amountMinor: parsed.data.amountMinor,
            currency: parsed.data.currency,
            event: parsed.data,
          });
          await consumeSettledCartLines(tx, order.customer_id, order.order_lines);
          return ok({
            checkoutId: order.id,
            paymentId: payment.id,
            orderNumber: order.order_number,
            status: "success",
            replayed: false,
          });
        },
        { isolationLevel: "Serializable" },
      );
    } catch (error) {
      if (isSerializableConflict(error) && attempt < MAX_SERIALIZABLE_ATTEMPTS - 1) continue;
      throw error;
    }
  }
  return err({ code: "CHECKOUT_IN_PROGRESS", message: "Payment settlement is still in progress." });
}

async function consumeSettledCartLines(
  tx: Prisma.TransactionClient,
  customerId: string,
  lines: readonly {
    product_id: string;
    variant_id: string | null;
    quantity: number;
  }[],
): Promise<void> {
  for (const line of lines) {
    // Delete exact or smaller selections before decrementing larger selections.
    // Reversing this order would turn 3 - 2 into 1 and then delete that valid remainder.
    await tx.$executeRaw`
      DELETE FROM public.customer_cart_lines
      WHERE customer_id = ${customerId}::uuid
        AND product_id = ${line.product_id}::uuid
        AND variant_id IS NOT DISTINCT FROM ${line.variant_id}::uuid
        AND quantity <= ${line.quantity}
    `;
    await tx.$executeRaw`
      UPDATE public.customer_cart_lines
      SET quantity = quantity - ${line.quantity}, updated_at = now()
      WHERE customer_id = ${customerId}::uuid
        AND product_id = ${line.product_id}::uuid
        AND variant_id IS NOT DISTINCT FROM ${line.variant_id}::uuid
        AND quantity > ${line.quantity}
    `;
  }
}

function replay(
  paymentId: string,
  checkoutId: string,
  orderNumber: string,
  status: CheckoutStatus,
): PaymentSettlement {
  return { checkoutId, paymentId, orderNumber, status, replayed: true };
}

async function flagForReview(
  tx: Parameters<typeof recordSuccessfulOrderPayment>[0],
  paymentId: string,
  orderId: string,
  code: CheckoutError["code"],
  event: PaystackSettlementEvent,
) {
  await tx.payments.updateMany({
    where: { id: paymentId, status: { not: "success" } },
    data: {
      status: "review_required",
      provider_transaction_id: event.providerTransactionId,
      verified_at: new Date(),
      verification_source: event.source,
      failure_code: code,
      failure_reason: "Provider settlement facts did not match the recorded checkout.",
    },
  });
  await tx.orders.updateMany({
    where: { id: orderId, payment_status: { not: "paid" } },
    data: { payment_status: "review_required", attention: "payment-review" },
  });
  await tx.order_payment_events.create({
    data: {
      order_id: orderId,
      payment_id: paymentId,
      kind: "review_required",
      status: "review_required",
      amount: (event.amountMinor / 100).toFixed(2),
      currency: event.currency,
      method: "paystack",
      note: "Paystack settlement requires review because recorded facts did not match.",
      metadata: { reference: event.reference, code },
    },
  });
}

async function recordUnsuccessfulPayment(
  tx: Parameters<typeof recordSuccessfulOrderPayment>[0],
  paymentId: string,
  orderId: string,
  event: PaystackSettlementEvent,
) {
  const terminal = event.status !== "pending";
  if (terminal) {
    await tx.holds.updateMany({
      where: { order_id: orderId, status: "active" },
      data: { payment_progress: "failed" },
    });
  }
  await tx.order_payment_events.create({
    data: {
      order_id: orderId,
      payment_id: paymentId,
      kind: eventKind(event.status),
      status: event.status,
      amount: (event.amountMinor / 100).toFixed(2),
      currency: event.currency,
      method: "paystack",
      note: terminal ? "Paystack payment did not settle successfully." : "Paystack payment is pending.",
      metadata: { reference: event.reference, source: event.source },
    },
  });
}

function eventKind(status: PaystackSettlementEvent["status"]) {
  switch (status) {
    case "failed":
      return "failed" as const;
    case "abandoned":
      return "abandoned" as const;
    case "reversed":
      return "reversed" as const;
    case "pending":
      return "pending" as const;
    case "success":
      return "succeeded" as const;
  }
}

function decimalToMinor(value: { toString(): string }) {
  return Math.round(Number(value.toString()) * 100);
}

function isSerializableConflict(error: unknown) {
  return Boolean(error && typeof error === "object" && Reflect.get(error, "code") === "P2034");
}
