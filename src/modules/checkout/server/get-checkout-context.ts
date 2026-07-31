import "server-only";

import { prisma } from "@/lib/prisma";
import type { ConsumerSession } from "@/modules/auth/server/session";
import {
  deriveCheckoutStatus,
  resumableOrderPaymentStatuses,
  resumablePaymentAttemptStatuses,
  type CheckoutOrderFulfilmentStatus,
  type CheckoutOrderPaymentStatus,
  type CheckoutPaymentAttemptStatus,
} from "@/modules/checkout/lifecycle";
import { listCheckoutDeliveryQuotes } from "@/modules/checkout/server/delivery-policy";
import type { CheckoutContext, CheckoutDraft } from "@/modules/checkout/types";
import { getOwnedProfile } from "@/modules/customers/server/account-profile";
import { listOwnedAddresses } from "@/modules/customers/server/addresses";

export async function getCheckoutContext(identity: ConsumerSession): Promise<CheckoutContext> {
  const [profile, addresses, activeOrder] = await Promise.all([
    getOwnedProfile(identity),
    listOwnedAddresses(identity),
    prisma.orders.findFirst({
      where: {
        customer_id: identity.customerId,
        source: "storefront-checkout",
        payment_status: { in: [...resumableOrderPaymentStatuses] },
        fulfilment_status: "unfulfilled",
        payments: {
          some: {
            access_code: { not: null },
            status: { in: [...resumablePaymentAttemptStatuses] },
          },
        },
      },
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        order_number: true,
        payment_status: true,
        fulfilment_status: true,
        currency: true,
        subtotal: true,
        delivery_fee: true,
        discount_amount: true,
        total: true,
        payments: {
          where: {
            access_code: { not: null },
            status: { in: [...resumablePaymentAttemptStatuses] },
          },
          orderBy: { created_at: "desc" },
          take: 1,
          select: {
            id: true,
            reference: true,
            access_code: true,
            status: true,
          },
        },
      },
    }),
  ]);

  const deliveryQuotes = await listCheckoutDeliveryQuotes(
    prisma,
    addresses.map((address) => ({
      id: address.id,
      city: address.city,
      state: address.state,
      country: address.country,
    })),
  );
  const defaultAddress = addresses.find((address) => address.isDefault) ?? addresses.at(0) ?? null;
  const selectedDeliveryQuote =
    deliveryQuotes.find((quote) => quote.addressId === defaultAddress?.id) ?? null;
  const phoneRequired = !profile.phone.trim();

  return {
    profile,
    profileComplete: Boolean(profile.email && !phoneRequired),
    phoneRequired,
    addresses,
    defaultAddressId: defaultAddress?.id ?? null,
    deliveryQuotes,
    selectedDeliveryQuote,
    deliveryAmountStatus: "estimated",
    activeCheckout: mapActiveCheckout(activeOrder),
  };
}

function mapActiveCheckout(
  order:
    | {
        id: string;
        order_number: string;
        payment_status: string;
        fulfilment_status: string;
        currency: string;
        subtotal: { toString(): string };
        delivery_fee: { toString(): string };
        discount_amount: { toString(): string };
        total: { toString(): string };
        payments: Array<{
          id: string;
          reference: string;
          access_code: string | null;
          status: string;
        }>;
      }
    | null,
): CheckoutDraft | null {
  const payment = order?.payments.at(0);
  if (!order || !payment?.access_code) return null;
  return {
    checkoutId: order.id,
    paymentId: payment.id,
    orderNumber: order.order_number,
    reference: payment.reference,
    accessCode: payment.access_code,
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
  };
}

function decimalToMinor(value: { toString(): string }): number {
  return Math.round(Number(value.toString()) * 100);
}
