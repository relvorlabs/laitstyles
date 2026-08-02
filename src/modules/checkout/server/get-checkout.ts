import "server-only";

import { err, ok, type Result } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import {
  type CheckoutOrderFulfilmentStatus,
  type CheckoutOrderPaymentStatus,
  type CheckoutPaymentAttemptStatus,
  deriveCheckoutStatus,
} from "@/modules/checkout/lifecycle";
import { checkoutIdentifierSchema } from "@/modules/checkout/schema";
import type { CheckoutDetail, CheckoutError, CheckoutIdentity } from "@/modules/checkout/types";

export async function getCheckout(
  identity: CheckoutIdentity,
  checkoutId: string,
): Promise<Result<CheckoutDetail, CheckoutError>> {
  const parsedId = checkoutIdentifierSchema.safeParse(checkoutId);
  if (!parsedId.success) {
    return err({ code: "CHECKOUT_INVALID", message: "Checkout identifier is invalid." });
  }
  const order = await prisma.orders.findFirst({
    where: { id: parsedId.data, customer_id: identity.customerId },
    include: {
      order_lines: true,
      payments: { orderBy: { created_at: "desc" }, take: 1 },
    },
  });
  if (!order) {
    return err({ code: "RESOURCE_NOT_OWNED", message: "Checkout was not found." });
  }
  const payment = order.payments[0];
  if (!payment) {
    return err({ code: "PAYMENT_NOT_FOUND", message: "Checkout payment was not found." });
  }
  return ok({
    checkoutId: order.id,
    paymentId: payment.id,
    orderNumber: order.order_number,
    reference: payment.reference,
    accessCode: order.payment_status === "cancelled" ? null : payment.access_code,
    status: deriveCheckoutStatus({
      orderPaymentStatus: order.payment_status as CheckoutOrderPaymentStatus,
      orderFulfilmentStatus: order.fulfilment_status as CheckoutOrderFulfilmentStatus,
      paymentAttemptStatus: payment.status as CheckoutPaymentAttemptStatus,
    }),
    currency: order.currency,
    subtotalMinor: decimalToMinor(order.subtotal),
    deliveryFeeMinor: decimalToMinor(order.delivery_fee),
    discountMinor: decimalToMinor(order.discount_amount),
    totalMinor: decimalToMinor(order.total),
    paidAt: order.paid_at?.toISOString() ?? null,
    lines: order.order_lines.map((line) => ({
      id: line.id,
      productId: line.product_id,
      variantId: line.variant_id,
      productName: line.product_name,
      variantLabel: line.variant_label,
      quantity: line.quantity,
      unitPriceMinor: decimalToMinor(line.unit_price),
    })),
  });
}

function decimalToMinor(value: { toString(): string }) {
  return Math.round(Number(value.toString()) * 100);
}
