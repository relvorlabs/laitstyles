import "server-only";

import type { Prisma } from "@/lib/prisma";
import { prisma } from "@/lib/prisma";
import type { StaffSession } from "@/modules/auth/server/session";
import { applyOperationalStockMutation } from "@/modules/inventory/server/operational-stock";
import { adminOrderInclude } from "@/modules/orders/server/mappers";
import type { OfflineSaleDraft } from "@/modules/orders/server/offline-sale-draft";
import type { OfflineSaleInput } from "@/modules/orders/types";
import type { PaystackInitializedTransaction } from "@/modules/payments/server/paystack";

export async function finalizeInitializedCheckout(
  actor: StaffSession,
  input: OfflineSaleInput,
  draft: OfflineSaleDraft,
  checkout: PaystackInitializedTransaction,
) {
  return prisma.$transaction(async (tx) => {
    await tx.payments.update({
      where: { id: draft.paymentId },
      data: {
        status: "initialized",
        access_code: checkout.accessCode,
        raw_response: checkout.rawResponse as Prisma.InputJsonValue,
      },
    });
    await tx.order_payment_events.create({
      data: {
        order_id: draft.orderId,
        payment_id: draft.paymentId,
        kind: "initialized",
        status: "initialized",
        amount: (draft.amountKobo / 100).toFixed(2),
        currency: "NGN",
        method: "paystack",
        actor_profile_id: actor.authUserId,
        note: "One-time Paystack checkout generated for an in-person sale.",
        metadata: { reference: draft.reference },
      },
    });
    await tx.order_timeline_events.create({
      data: {
        order_id: draft.orderId,
        status: "pending-payment",
        actor_profile_id: actor.authUserId,
        note: "Paystack checkout generated. Awaiting server-verified payment.",
        metadata: { paymentReference: draft.reference },
      },
    });
    await tx.activity_events.create({
      data: {
        kind: "sale",
        title: `Paystack checkout generated for ${draft.orderNumber}`,
        detail: `${draft.lines.reduce((sum, line) => sum + line.quantity, 0)} unit${draft.lines.reduce((sum, line) => sum + line.quantity, 0) === 1 ? "" : "s"} · ${input.channel.replaceAll("-", " ")}`,
        actor_profile_id: actor.authUserId,
        order_id: draft.orderId,
        customer_id: draft.customerId,
      },
    });
    return tx.orders.findUniqueOrThrow({
      where: { id: draft.orderId },
      include: adminOrderInclude,
    });
  });
}

export async function cancelFailedOfflineSaleDraft(
  actor: StaffSession,
  draft: OfflineSaleDraft,
  failure: unknown,
) {
  const failureMessage =
    failure instanceof Error ? failure.message : "Paystack checkout initialization failed.";

  await prisma.$transaction(async (tx) => {
    for (const line of draft.lines) {
      await applyOperationalStockMutation(tx, {
        productId: line.productId,
        ...(line.variantId ? { variantId: line.variantId } : {}),
        quantity: line.quantity,
        kind: "release-reserved",
        actorProfileId: actor.authUserId,
        note: `Released after checkout initialization failed for ${draft.orderNumber}.`,
        relatedOrderId: draft.orderId,
        metadata: {
          operation: "offline-sale-checkout-failed",
          orderLineId: line.id,
          paymentReference: draft.reference,
        },
      });
      await tx.order_lines.update({
        where: { id: line.id },
        data: { stock_state: "released" },
      });
    }

    await tx.payments.update({
      where: { id: draft.paymentId },
      data: { status: "failed", gateway_response: failureMessage },
    });
    await tx.orders.update({
      where: { id: draft.orderId },
      data: {
        payment_status: "cancelled",
        fulfilment_status: "cancelled",
        attention: null,
      },
    });
    await tx.order_payment_events.create({
      data: {
        order_id: draft.orderId,
        payment_id: draft.paymentId,
        kind: "failed",
        status: "failed",
        amount: (draft.amountKobo / 100).toFixed(2),
        currency: "NGN",
        method: "paystack",
        actor_profile_id: actor.authUserId,
        note: failureMessage,
        metadata: { reference: draft.reference },
      },
    });
    await tx.order_timeline_events.create({
      data: {
        order_id: draft.orderId,
        status: "cancelled",
        actor_profile_id: actor.authUserId,
        note: "Order cancelled and reserved stock released because Paystack checkout was not initialized.",
        metadata: { paymentReference: draft.reference },
      },
    });
    await tx.activity_events.create({
      data: {
        kind: "sale",
        title: `Checkout failed for ${draft.orderNumber}`,
        detail: "Order cancelled and reserved stock released.",
        actor_profile_id: actor.authUserId,
        order_id: draft.orderId,
        customer_id: draft.customerId,
      },
    });
  });
}
