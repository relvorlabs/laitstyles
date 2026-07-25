import "server-only";

import type { Prisma } from "@/lib/prisma";
import type {
  AdminOrderCustomer,
  ControlRoomOrder,
  DeliveryAddress,
  OrderCourierBoundary,
  OrderLineStockState,
  OrderPaymentEvent,
  OrderSource,
  OrderStatus,
  OrderTimelineEvent,
  PaymentMethod,
  PaymentStatus,
  SalesChannel,
} from "@/modules/orders/types";

export const adminOrderInclude = {
  customer: true,
  order_lines: {
    orderBy: { id: "asc" },
    include: {
      products: {
        select: {
          name: true,
          catalogue_categories: { select: { name: true } },
        },
      },
      product_variants: { select: { label: true, sku: true } },
    },
  },
  order_timeline_events: {
    orderBy: { occurred_at: "asc" },
    include: { profiles: { select: { display_name: true } } },
  },
  order_payment_events: { orderBy: { occurred_at: "asc" } },
} satisfies Prisma.ordersInclude;

export type AdminOrderRow = Prisma.ordersGetPayload<{
  include: typeof adminOrderInclude;
}>;

const orderStatuses = new Set<OrderStatus>([
  "pending-payment",
  "payment-confirmed",
  "preparing",
  "packed",
  "ready-for-pickup",
  "dispatched",
  "out-for-delivery",
  "delivered",
  "cancelled",
  "refunded",
  "returned",
]);

export function mapDatabaseOrderStatus(row: Pick<AdminOrderRow, "payment_status" | "fulfilment_status" | "fulfilment_method">): OrderStatus {
  if (row.fulfilment_status === "cancelled") return "cancelled";
  if (row.fulfilment_status === "returned" || row.fulfilment_status === "partially_returned") {
    return "returned";
  }
  if (row.payment_status === "refunded" || row.payment_status === "partially_refunded") {
    return "refunded";
  }
  if (row.fulfilment_status === "delivered") return "delivered";
  if (row.fulfilment_status === "dispatched") return "dispatched";
  if (row.fulfilment_status === "ready_for_dispatch") {
    return row.fulfilment_method === "pickup" ? "ready-for-pickup" : "packed";
  }
  if (row.fulfilment_status === "processing") return "preparing";
  return row.payment_status === "paid" ? "payment-confirmed" : "pending-payment";
}

function mapPaymentStatus(value: AdminOrderRow["payment_status"]): PaymentStatus {
  if (value === "paid") return "paid";
  if (value === "processing") return "deposit";
  if (value === "partially_refunded" || value === "refunded") return "refunded";
  if (value === "review_required" || value === "cancelled") return "failed";
  return "pending";
}

function mapPaymentEventStatus(
  value: AdminOrderRow["order_payment_events"][number]["status"],
  fallback: PaymentStatus,
): PaymentStatus {
  if (value === "success") return "paid";
  if (value === "initialized" || value === "pending" || value === "initializing") return "pending";
  if (value === "reversed") return "refunded";
  if (value === "failed" || value === "abandoned" || value === "review_required") return "failed";
  return fallback;
}

function mapChannel(value: string | null): SalesChannel {
  const normalized = (value ?? "other").replaceAll("_", "-");
  switch (normalized) {
    case "online":
    case "physical-store":
    case "whatsapp":
    case "instagram":
    case "phone":
    case "pop-up":
    case "staff-assisted":
      return normalized;
    default:
      return "other";
  }
}

function mapSource(value: string): OrderSource {
  const normalized = value.replaceAll("_", "-");
  if (normalized === "offline-sale" || normalized === "hold-conversion") return normalized;
  return "online-order";
}

function mapPaymentMethod(value: string | null): PaymentMethod | null {
  if (!value) return null;
  const normalized = value.replaceAll("_", "-");
  switch (normalized) {
    case "cash":
    case "bank-transfer":
    case "card":
    case "pos":
    case "pay-on-delivery":
      return normalized;
    default:
      return "other";
  }
}

function mapStockState(value: AdminOrderRow["order_lines"][number]["stock_state"]): OrderLineStockState {
  if (value === "committed") return "committed";
  if (value === "reserved") return "reserved";
  if (value === "returned") return "returned";
  if (value === "released") return "released";
  return "uncommitted";
}

function mapCustomer(row: AdminOrderRow): AdminOrderCustomer | null {
  if (!row.customer) return null;
  return {
    id: row.customer.id,
    name: row.customer.name,
    email: row.customer.email ?? "",
    phone: row.customer.phone ?? "",
    city: row.customer.city ?? "",
  };
}

function mapDeliveryAddress(value: Prisma.JsonValue | null): DeliveryAddress | null {
  const record = asRecord(value);
  if (!record) return null;
  return {
    line1: stringValue(record.line1),
    line2: stringValue(record.line2),
    city: stringValue(record.city),
    state: stringValue(record.state),
    country: "Nigeria",
  };
}

function mapCourier(value: Prisma.JsonValue | null): OrderCourierBoundary | null {
  const record = asRecord(value);
  if (!record) return null;
  const name = stringValue(record.name);
  const trackingCode = stringValue(record.trackingCode ?? record.tracking_code);
  const statusLabel = stringValue(record.statusLabel ?? record.status_label);
  if (!name && !trackingCode && !statusLabel) return null;
  return { name: name || "Courier", trackingCode, statusLabel: statusLabel || "Pending" };
}

function mapTimeline(row: AdminOrderRow, fallback: OrderStatus): OrderTimelineEvent[] {
  return row.order_timeline_events.map((event) => {
    const normalized = event.status.replaceAll("_", "-");
    return {
      id: event.id,
      status: orderStatuses.has(normalized as OrderStatus) ? (normalized as OrderStatus) : fallback,
      occurredAt: event.occurred_at.toISOString(),
      actor: event.profiles?.display_name ?? "Store team",
      note: event.note ?? "Order status updated.",
    };
  });
}

function mapPayments(row: AdminOrderRow, fallback: PaymentStatus): OrderPaymentEvent[] {
  return row.order_payment_events.map((event) => ({
    id: event.id,
    status: mapPaymentEventStatus(event.status, fallback),
    method: mapPaymentMethod(event.method),
    amount: event.amount.toNumber(),
    occurredAt: event.occurred_at.toISOString(),
    note: event.note ?? "Payment state recorded.",
  }));
}

export function mapAdminOrderRow(row: AdminOrderRow): ControlRoomOrder {
  const fulfilmentStatus = mapDatabaseOrderStatus(row);
  const paymentStatus = mapPaymentStatus(row.payment_status);
  const customer = mapCustomer(row);
  const attention = mapAttention(row.attention);

  return {
    id: row.order_number,
    databaseId: row.id,
    customerId: row.customer_id,
    customerLabel: row.customer_name ?? customer?.name,
    customer,
    source: mapSource(row.source),
    channel: mapChannel(row.channel),
    paymentStatus,
    paymentMethod: mapPaymentMethod(row.payment_method),
    fulfilmentStatus,
    lines: row.order_lines.map((line) => ({
      id: line.id,
      productId: line.product_id,
      ...(line.variant_id ? { variantId: line.variant_id } : {}),
      quantity: line.quantity,
      unitPrice: line.unit_price.toNumber(),
      stockState: mapStockState(line.stock_state),
      productName: line.product_name || line.products.name,
      productCategory: line.products.catalogue_categories?.name ?? "Catalogue item",
      ...(line.variant_label || line.product_variants?.label
        ? { variantLabel: line.variant_label ?? line.product_variants?.label ?? undefined }
        : {}),
      ...(line.sku || line.product_variants?.sku
        ? { sku: line.sku ?? line.product_variants?.sku ?? undefined }
        : {}),
    })),
    total: row.total.toNumber(),
    refundedAmount: row.refunded_amount.toNumber(),
    placedAt: row.placed_at.toISOString(),
    deliveryCity: row.delivery_city ?? customer?.city ?? "",
    deliveryAddress: mapDeliveryAddress(row.delivery_address),
    courier: mapCourier(row.courier),
    notes: row.notes ?? "",
    timeline: mapTimeline(row, fulfilmentStatus),
    payments: mapPayments(row, paymentStatus),
    ...(attention ? { attention } : {}),
  };
}

function mapAttention(value: string | null) {
  if (value === "payment" || value === "delivery" || value === "packing" || value === "return") {
    return value;
  }
  return undefined;
}

function asRecord(value: Prisma.JsonValue | null): Record<string, Prisma.JsonValue> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, Prisma.JsonValue>)
    : null;
}

function stringValue(value: Prisma.JsonValue | undefined): string {
  return typeof value === "string" ? value : "";
}
