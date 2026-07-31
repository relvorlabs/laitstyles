import "server-only";

import { prisma } from "@/lib/prisma";
import type { ConsumerSession } from "@/modules/auth/server/session";
import type { CheckoutContext, CheckoutDraft, CheckoutStatus } from "@/modules/checkout/types";
import { getOwnedProfile } from "@/modules/customers/server/account-profile";
import { listOwnedAddresses } from "@/modules/customers/server/addresses";

const recoverablePaymentStatuses = [
  "initializing",
  "initialized",
  "pending",
  "failed",
  "abandoned",
  "reversed",
  "review_required",
] as const;

export async function getCheckoutContext(identity: ConsumerSession): Promise<CheckoutContext> {
  const [profile, addresses, deliveryZones, activeOrder] = await Promise.all([
    getOwnedProfile(identity),
    listOwnedAddresses(identity),
    prisma.delivery_zones.findMany({
      where: { enabled: true },
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        city: true,
        rate: true,
        estimated_days: true,
      },
    }),
    prisma.orders.findFirst({
      where: {
        customer_id: identity.customerId,
        source: "storefront-checkout",
        payments: { some: { status: { in: [...recoverablePaymentStatuses] } } },
      },
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        order_number: true,
        currency: true,
        subtotal: true,
        delivery_fee: true,
        discount_amount: true,
        total: true,
        payments: {
          where: { status: { in: [...recoverablePaymentStatuses] } },
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

  const defaultAddress = addresses.find((address) => address.isDefault) ?? addresses[0] ?? null;
  const matchingZone = defaultAddress
    ? deliveryZones.find(
        (zone) => normalizeLocation(zone.city) === normalizeLocation(defaultAddress.city),
      )
    : null;
  const selectedZone = matchingZone ?? deliveryZones[0] ?? null;
  const phoneRequired = !profile.phone.trim();

  return {
    profile,
    profileComplete: Boolean(profile.email && !phoneRequired),
    phoneRequired,
    addresses,
    defaultAddressId: defaultAddress?.id ?? null,
    deliveryZones: deliveryZones.map((zone) => ({
      id: zone.id,
      name: zone.name,
      city: zone.city,
      feeMinor: Math.round(zone.rate.toNumber() * 100),
      estimatedDays: zone.estimated_days,
    })),
    selectedDeliveryZoneId: selectedZone?.id ?? null,
    deliveryAmountStatus: "estimated",
    activeCheckout: mapActiveCheckout(activeOrder),
  };
}

function mapActiveCheckout(
  order:
    | {
        id: string;
        order_number: string;
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
  const payment = order?.payments[0];
  if (!order || !payment) return null;
  return {
    checkoutId: order.id,
    paymentId: payment.id,
    orderNumber: order.order_number,
    reference: payment.reference,
    accessCode: payment.access_code,
    status: payment.status as CheckoutStatus,
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

function normalizeLocation(value: string): string {
  return value.trim().toLocaleLowerCase("en-NG");
}
