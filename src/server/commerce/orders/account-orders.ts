import "server-only";

import type {
  AccountDeliveryAddress,
  AccountLineReviewState,
  AccountOrderDetail,
  AccountOrderImage,
  AccountOrderLine,
  AccountOrderSummary,
} from "@/features/storefront/account/orders/order-types";
import { type Prisma, prisma } from "@/lib/prisma";
import { getReviewEligibility } from "@/server/commerce/reviews/review-policy";

const accountOrderLineSelect = {
  id: true,
  product_name: true,
  variant_label: true,
  sku: true,
  quantity: true,
  unit_price: true,
  fulfilment_status: true,
  delivered_quantity: true,
  delivered_at: true,
  cancelled_quantity: true,
  refund_status: true,
  refunded_amount: true,
  refunded_at: true,
  products: {
    select: {
      slug: true,
      lifecycle: true,
      publication: true,
      product_media: {
        where: { kind: "product_cover" },
        orderBy: { position: "asc" },
        take: 1,
        select: {
          cloudinary_assets: {
            select: {
              delivery_url: true,
              secure_url: true,
              alt: true,
              width: true,
              height: true,
            },
          },
        },
      },
    },
  },
  product_review: {
    select: {
      id: true,
      status: true,
      rejection_reason: true,
    },
  },
  return_lines: {
    where: { return: { is: { status: "completed" } } },
    select: { quantity: true },
  },
} satisfies Prisma.order_linesSelect;

const accountOrderSummarySelect = {
  order_number: true,
  payment_status: true,
  fulfilment_status: true,
  currency: true,
  total: true,
  placed_at: true,
  updated_at: true,
  order_lines: {
    orderBy: { id: "asc" },
    select: accountOrderLineSelect,
  },
} satisfies Prisma.ordersSelect;

const accountOrderDetailSelect = {
  ...accountOrderSummarySelect,
  payment_method: true,
  fulfilment_method: true,
  subtotal: true,
  delivery_fee: true,
  discount_amount: true,
  refunded_amount: true,
  delivery_name: true,
  delivery_phone: true,
  delivery_city: true,
  delivery_address: true,
  order_timeline_events: {
    orderBy: { occurred_at: "asc" },
    select: {
      status: true,
      occurred_at: true,
    },
  },
} satisfies Prisma.ordersSelect;

type AccountOrderSummaryRow = Prisma.ordersGetPayload<{
  select: typeof accountOrderSummarySelect;
}>;
type AccountOrderDetailRow = Prisma.ordersGetPayload<{
  select: typeof accountOrderDetailSelect;
}>;
type AccountOrderLineRow = AccountOrderSummaryRow["order_lines"][number];

type GeneratedPaymentStatus = AccountOrderSummaryRow["payment_status"];
type GeneratedOrderFulfilmentStatus = AccountOrderSummaryRow["fulfilment_status"];
type GeneratedLineFulfilmentStatus = AccountOrderLineRow["fulfilment_status"];
type GeneratedLineRefundStatus = AccountOrderLineRow["refund_status"];

const paymentStatusCopy = {
  pending: "Payment pending",
  processing: "Payment processing",
  paid: "Paid",
  partially_refunded: "Partially refunded",
  refunded: "Refunded",
  review_required: "Payment needs attention",
  cancelled: "Payment cancelled",
} satisfies Record<GeneratedPaymentStatus, string>;

const orderFulfilmentStatusCopy = {
  unfulfilled: "Not yet fulfilled",
  processing: "Processing",
  ready_for_dispatch: "Ready for dispatch",
  dispatched: "Dispatched",
  delivered: "Delivered",
  partially_returned: "Partially returned",
  returned: "Returned",
  cancelled: "Cancelled",
} satisfies Record<GeneratedOrderFulfilmentStatus, string>;

const lineFulfilmentStatusCopy = {
  unfulfilled: "Not yet fulfilled",
  processing: "Processing",
  ready_for_dispatch: "Ready for dispatch",
  dispatched: "Dispatched",
  partially_delivered: "Partially delivered",
  delivered: "Delivered",
  partially_cancelled: "Partially cancelled",
  cancelled: "Cancelled",
  partially_returned: "Partially returned",
  returned: "Returned",
} satisfies Record<GeneratedLineFulfilmentStatus, string>;

const lineRefundStatusCopy = {
  not_refunded: "Not refunded",
  partially_refunded: "Partially refunded",
  refunded: "Refunded",
} satisfies Record<GeneratedLineRefundStatus, string>;

function decimalToKobo(value: Prisma.Decimal): number {
  return Math.round(value.toNumber() * 100);
}

function completedReturnedQuantity(line: AccountOrderLineRow): number {
  return line.return_lines.reduce((total, returned) => total + returned.quantity, 0);
}

function mapImage(line: AccountOrderLineRow): AccountOrderImage | null {
  const asset = line.products.product_media[0]?.cloudinary_assets;
  if (!asset) return null;

  return {
    src: asset.delivery_url ?? asset.secure_url,
    alt: asset.alt || line.product_name,
    width: asset.width,
    height: asset.height,
  };
}

function eligibilityFor(line: AccountOrderLineRow, now: Date, options: { hasReview: boolean }) {
  return getReviewEligibility(
    {
      owned: true,
      fulfilmentStatus: line.fulfilment_status,
      deliveredQuantity: line.delivered_quantity,
      deliveredAt: line.delivered_at,
      refundStatus: line.refund_status,
      completedReturnedQuantity: completedReturnedQuantity(line),
      purchasedQuantity: line.quantity,
      hasReview: options.hasReview,
    },
    now,
  );
}

function mapReviewState(line: AccountOrderLineRow, now: Date): AccountLineReviewState {
  const review = line.product_review;

  if (!review) {
    const eligibility = eligibilityFor(line, now, { hasReview: false });
    return eligibility.eligible
      ? { kind: "eligible", expiresAt: eligibility.expiresAt.toISOString() }
      : { kind: "ineligible", reason: eligibility.reason };
  }

  if (review.status === "pending") {
    return { kind: "pending", reviewId: review.id };
  }

  if (review.status === "published") {
    const fullyReturned =
      line.fulfilment_status === "returned" ||
      (line.delivered_quantity > 0 && completedReturnedQuantity(line) >= line.delivered_quantity);
    const lifecycleMarker = fullyReturned
      ? "returned"
      : line.refund_status === "refunded"
        ? "refunded"
        : undefined;

    return lifecycleMarker
      ? { kind: "published", reviewId: review.id, lifecycleMarker }
      : { kind: "published", reviewId: review.id };
  }

  const resubmission = eligibilityFor(line, now, { hasReview: false });
  const canResubmit = resubmission.eligible;

  if (review.status === "rejected") {
    return {
      kind: "rejected",
      reviewId: review.id,
      reason:
        review.rejection_reason ?? "This review needs changes before it can be submitted again.",
      canResubmit,
    };
  }

  return { kind: "withdrawn", reviewId: review.id, canResubmit };
}

function mapLine(line: AccountOrderLineRow, now: Date): AccountOrderLine {
  const unitPriceKobo = decimalToKobo(line.unit_price);
  const productIsPublic =
    line.products.lifecycle === "active" && line.products.publication === "published";

  return {
    id: line.id,
    productName: line.product_name,
    productSlug: productIsPublic ? line.products.slug : null,
    variantLabel: line.variant_label,
    sku: line.sku,
    image: mapImage(line),
    quantity: line.quantity,
    unitPriceKobo,
    lineTotalKobo: unitPriceKobo * line.quantity,
    fulfilmentStatus: {
      code: line.fulfilment_status,
      label: lineFulfilmentStatusCopy[line.fulfilment_status],
    },
    deliveredQuantity: line.delivered_quantity,
    deliveredAt: line.delivered_at?.toISOString() ?? null,
    cancelledQuantity: line.cancelled_quantity,
    refundStatus: {
      code: line.refund_status,
      label: lineRefundStatusCopy[line.refund_status],
    },
    refundedAmountKobo: decimalToKobo(line.refunded_amount),
    refundedAt: line.refunded_at?.toISOString() ?? null,
    completedReturnedQuantity: completedReturnedQuantity(line),
    reviewState: mapReviewState(line, now),
  };
}

function mapSummary(row: AccountOrderSummaryRow, now: Date): AccountOrderSummary {
  const lines = row.order_lines.map((line) => mapLine(line, now));

  return {
    orderNumber: row.order_number,
    placedAt: row.placed_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    currency: row.currency,
    totalKobo: decimalToKobo(row.total),
    itemCount: lines.reduce((total, line) => total + line.quantity, 0),
    itemNames: lines.map((line) => line.productName),
    images: lines
      .map((line) => line.image)
      .filter((image): image is AccountOrderImage => image !== null)
      .slice(0, 2),
    reviewableItemCount: lines.filter((line) => line.reviewState.kind === "eligible").length,
    paymentStatus: {
      code: row.payment_status,
      label: paymentStatusCopy[row.payment_status],
    },
    fulfilmentStatus: {
      code: row.fulfilment_status,
      label: orderFulfilmentStatusCopy[row.fulfilment_status],
    },
  };
}

function stringProperty(value: Prisma.JsonValue | null, property: string): string | null {
  if (!value || Array.isArray(value) || typeof value !== "object") return null;
  const candidate = value[property];
  return typeof candidate === "string" && candidate.trim() ? candidate : null;
}

function mapDelivery(row: AccountOrderDetailRow): AccountDeliveryAddress | null {
  const delivery = {
    name: row.delivery_name,
    phone: row.delivery_phone,
    line1: stringProperty(row.delivery_address, "line1"),
    line2: stringProperty(row.delivery_address, "line2"),
    city: row.delivery_city ?? stringProperty(row.delivery_address, "city"),
    state: stringProperty(row.delivery_address, "state"),
    country: stringProperty(row.delivery_address, "country"),
    postalCode:
      stringProperty(row.delivery_address, "postalCode") ??
      stringProperty(row.delivery_address, "postal_code"),
  } satisfies AccountDeliveryAddress;

  return Object.values(delivery).some((value) => value !== null) ? delivery : null;
}

export async function getAccountOrders(customerId: string): Promise<AccountOrderSummary[]> {
  const rows = await prisma.orders.findMany({
    where: { customer_id: customerId },
    orderBy: { placed_at: "desc" },
    select: accountOrderSummarySelect,
  });
  const now = new Date();
  return rows.map((row) => mapSummary(row, now));
}

export async function getAccountOrder(
  customerId: string,
  orderNumber: string,
): Promise<AccountOrderDetail | null> {
  const row = await prisma.orders.findFirst({
    where: {
      customer_id: customerId,
      order_number: orderNumber,
    },
    select: accountOrderDetailSelect,
  });

  if (!row) return null;

  const now = new Date();
  const summary = mapSummary(row, now);

  return {
    ...summary,
    paymentMethod: row.payment_method,
    fulfilmentMethod: row.fulfilment_method,
    subtotalKobo: decimalToKobo(row.subtotal),
    deliveryFeeKobo: decimalToKobo(row.delivery_fee),
    discountAmountKobo: decimalToKobo(row.discount_amount),
    refundedAmountKobo: decimalToKobo(row.refunded_amount),
    delivery: mapDelivery(row),
    lines: row.order_lines.map((line) => mapLine(line, now)),
    timeline: row.order_timeline_events.map((event) => ({
      status: event.status,
      occurredAt: event.occurred_at.toISOString(),
    })),
  };
}
