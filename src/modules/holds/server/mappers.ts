import "server-only";

import type { Prisma } from "@/lib/prisma";
import type {
  ControlRoomHold,
  HoldPaymentProgress,
  HoldRisk,
  HoldSource,
} from "@/modules/holds/types";

export const adminHoldInclude = {
  customers: {
    select: { id: true, name: true, email: true, phone: true, city: true },
  },
  products: {
    select: {
      id: true,
      name: true,
      sku: true,
      archive_number: true,
      price: true,
      product_media: {
        where: { variant_id: null },
        orderBy: { position: "asc" },
        take: 1,
        include: {
          cloudinary_assets: {
            select: { secure_url: true, delivery_url: true, alt: true },
          },
        },
      },
      product_variants: {
        select: {
          id: true,
          label: true,
          sku: true,
          price: true,
          product_media: {
            orderBy: { position: "asc" },
            take: 1,
            include: {
              cloudinary_assets: {
                select: { secure_url: true, delivery_url: true, alt: true },
              },
            },
          },
        },
      },
    },
  },
  orders: { select: { order_number: true } },
} satisfies Prisma.holdsInclude;

export type AdminHoldRow = Prisma.holdsGetPayload<{
  include: typeof adminHoldInclude;
}>;

export function mapAdminHoldRow(row: AdminHoldRow, now = new Date()): ControlRoomHold {
  const variant = row.variant_id
    ? row.products.product_variants.find((entry) => entry.id === row.variant_id)
    : undefined;
  const media = variant?.product_media[0] ?? row.products.product_media[0];
  const asset = media?.cloudinary_assets;
  const status = row.status;
  const secondsRemaining = Math.max(
    0,
    Math.floor((row.expires_at.getTime() - now.getTime()) / 1_000),
  );

  return {
    id: row.id,
    customerId: row.customer_id,
    customerLabel: row.customers.name,
    customer: {
      id: row.customers.id,
      name: row.customers.name,
      email: row.customers.email ?? "",
      phone: row.customers.phone ?? "",
      city: row.customers.city ?? "",
    },
    productId: row.product_id,
    ...(row.variant_id ? { variantId: row.variant_id } : {}),
    product: {
      name: row.products.name,
      variantLabel: variant?.label ?? null,
      reference:
        variant?.sku ??
        row.products.sku ??
        row.products.archive_number ??
        row.products.id.slice(0, 8),
      imageUrl: asset ? (asset.delivery_url ?? asset.secure_url) : "/product-placeholder.svg",
      imageAlt: asset?.alt || row.products.name,
    },
    ...(row.order_id ? { orderId: row.order_id } : {}),
    ...(row.orders?.order_number ? { convertedOrderId: row.orders.order_number } : {}),
    quantity: row.quantity,
    stage: row.stage,
    source: mapHoldSource(row.source),
    paymentProgress: mapPaymentProgress(row.payment_progress),
    status,
    risk: mapRisk(status, row.payment_progress, secondsRemaining),
    secondsRemaining,
    startedAt: row.started_at.toISOString(),
    expiresAt: row.expires_at.toISOString(),
    ...(row.released_at ? { releasedAt: row.released_at.toISOString() } : {}),
    ...(row.converted_at ? { convertedAt: row.converted_at.toISOString() } : {}),
    ...(row.note ? { note: row.note } : {}),
  };
}

function mapHoldSource(value: string): HoldSource {
  if (value === "physical_store") return "physical-store";
  if (
    value === "storefront" ||
    value === "admin" ||
    value === "whatsapp" ||
    value === "instagram" ||
    value === "physical-store"
  ) {
    return value;
  }
  return "admin";
}

function mapPaymentProgress(value: string): HoldPaymentProgress {
  return value === "not_started" ? "not-started" : (value as HoldPaymentProgress);
}

function mapRisk(
  status: ControlRoomHold["status"],
  paymentProgress: string,
  secondsRemaining: number,
): HoldRisk {
  if (status === "released" || status === "cancelled") return "released";
  if (status === "converted") return "converted";
  if (status === "expired" || secondsRemaining <= 0) return "expired";
  if (paymentProgress === "failed") return "payment-risk";
  if (secondsRemaining <= 5 * 60) return "expiring";
  return "stable";
}
