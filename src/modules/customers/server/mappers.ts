import "server-only";

import type { Prisma } from "@/lib/prisma";
import type {
  CustomerAttentionReason,
  CustomerProductRelationship,
  CustomerRelationshipProfile,
  CustomerSegment,
  CustomerTimelineEvent,
  CustomerType,
} from "@/modules/customers/types";
import type { DeliveryAddress, OrderStatus } from "@/modules/orders/types";

const productProjection = {
  select: {
    id: true,
    name: true,
    inventory_mode: true,
    catalogue_categories: { select: { name: true } },
    product_media: {
      where: { variant_id: null },
      orderBy: { position: "asc" },
      take: 1,
      include: { cloudinary_assets: true },
    },
  },
} as const;

export const customerProfileInclude = {
  customer_addresses: { orderBy: [{ is_default: "desc" }, { created_at: "asc" }] },
  customer_notes: {
    orderBy: { created_at: "desc" },
    include: { profiles: { select: { display_name: true, email: true } } },
  },
  customer_saved_products: {
    orderBy: { created_at: "desc" },
    include: { products: productProjection },
  },
  orders: {
    orderBy: { placed_at: "desc" },
    include: {
      order_lines: {
        orderBy: { id: "asc" },
        include: {
          products: productProjection,
          product_review: true,
        },
      },
      order_payment_events: { orderBy: { occurred_at: "asc" } },
      order_timeline_events: { orderBy: { occurred_at: "asc" } },
      returns: { orderBy: { requested_at: "asc" } },
    },
  },
  holds: {
    orderBy: { started_at: "desc" },
    include: { products: productProjection, orders: { select: { order_number: true } } },
  },
  activity_events: { orderBy: { occurred_at: "desc" } },
} satisfies Prisma.customersInclude;

export type CustomerProfileRow = Prisma.customersGetPayload<{
  include: typeof customerProfileInclude;
}>;

export type CustomerMetricProjection = {
  lifetimeSpend: number;
  orderCount: number;
  paidOrderCount: number;
  returnCount: number;
  cancellationCount: number;
  activeHoldCount: number;
  reviewCount: number;
  lastPurchaseAt: Date | null;
  paymentAttention: boolean;
  deliveryAttention: boolean;
  returnAttention: boolean;
  holdAttention: boolean;
};

export function mapCustomerProfile(
  row: CustomerProfileRow,
  metrics: CustomerMetricProjection,
): CustomerRelationshipProfile {
  const attention = mapAttention(metrics);
  const segments = mapSegments(metrics, attention);
  const products = mapProductRelationships(row);
  return {
    customer: {
      id: row.id,
      name: row.name,
      email: row.email ?? "",
      phone: row.phone ?? "",
      city: row.city ?? "",
      type: mapCustomerType(row.type),
      createdAt: row.created_at.toISOString(),
      addresses: row.customer_addresses.map((address) => ({
        id: address.id,
        label: address.label ?? "Address",
        line1: address.line1,
        line2: address.line2 ?? "",
        city: address.city,
        state: address.state ?? "",
        country: "Nigeria",
        isDefault: address.is_default,
        deliveryNotes: address.delivery_notes ?? "",
      })),
      savedProductIds: row.customer_saved_products.map((saved) => saved.product_id),
      notes: row.customer_notes.map((note) => ({
        id: note.id,
        body: note.body,
        createdAt: note.created_at.toISOString(),
        author: note.profiles?.display_name ?? note.profiles?.email ?? "Store team",
      })),
    },
    metrics: {
      lifetimeSpend: metrics.lifetimeSpend,
      averageOrderValue: metrics.paidOrderCount
        ? Math.round(metrics.lifetimeSpend / metrics.paidOrderCount)
        : 0,
      orderCount: metrics.orderCount,
      paidOrderCount: metrics.paidOrderCount,
      returnCount: metrics.returnCount,
      cancellationCount: metrics.cancellationCount,
      activeHoldCount: metrics.activeHoldCount,
      reviewCount: metrics.reviewCount,
      lastPurchaseAt: metrics.lastPurchaseAt?.toISOString() ?? null,
    },
    segments,
    attention,
    timeline: mapTimeline(row),
    products,
    deliveryHistory: row.orders.map((order) => ({
      orderId: order.order_number,
      occurredAt: order.placed_at.toISOString(),
      city: order.delivery_city ?? row.city ?? "",
      address: mapDeliveryAddress(order.delivery_address),
      status: mapOrderStatus(order),
    })),
  };
}

function mapCustomerType(value: string): CustomerType {
  if (value === "stylist" || value === "reseller" || value === "walk-in") return value;
  return "individual";
}

function mapAttention(metrics: CustomerMetricProjection): CustomerAttentionReason[] {
  const values: CustomerAttentionReason[] = [];
  if (metrics.paymentAttention) values.push("payment");
  if (metrics.deliveryAttention) values.push("delivery");
  if (metrics.returnAttention) values.push("return");
  if (metrics.holdAttention) values.push("hold");
  return values;
}

function mapSegments(
  metrics: CustomerMetricProjection,
  attention: CustomerAttentionReason[],
): CustomerSegment[] {
  const values: CustomerSegment[] = [];
  if (attention.length) values.push("needs-attention");
  if (metrics.lifetimeSpend >= 50_000) values.push("high-value");
  if (metrics.orderCount >= 2) values.push("returning");
  else values.push("new");
  return values;
}

function mapProductRelationships(row: CustomerProfileRow): CustomerProductRelationship[] {
  const relationships = new Map<string, CustomerProductRelationship>();
  const touch = (
    product: ProductProjection,
    occurredAt: Date,
  ): CustomerProductRelationship => {
    const existing = relationships.get(product.id);
    if (existing) {
      if (occurredAt.getTime() > Date.parse(existing.lastInteractionAt)) {
        existing.lastInteractionAt = occurredAt.toISOString();
      }
      return existing;
    }
    const media = product.product_media[0]?.cloudinary_assets;
    const value: CustomerProductRelationship = {
      productId: product.id,
      productName: product.name,
      category: product.catalogue_categories?.name ?? "Catalogue item",
      inventoryMode: product.inventory_mode.replaceAll("_", "-"),
      image: media?.delivery_url ?? media?.secure_url ?? "/placeholder.svg",
      imageAlt: media?.alt || `${product.name} product image`,
      purchasedQuantity: 0,
      heldQuantity: 0,
      saved: false,
      reviewed: false,
      lastInteractionAt: occurredAt.toISOString(),
    };
    relationships.set(product.id, value);
    return value;
  };

  for (const order of row.orders) {
    if (!isPaidOrder(order)) continue;
    for (const line of order.order_lines) {
      const relationship = touch(line.products, order.placed_at);
      relationship.purchasedQuantity += line.quantity;
      if (line.product_review) {
        relationship.reviewed = true;
        if (line.product_review.created_at > order.placed_at) {
          relationship.lastInteractionAt = line.product_review.created_at.toISOString();
        }
      }
    }
  }
  for (const hold of row.holds) {
    touch(hold.products, hold.released_at ?? hold.converted_at ?? hold.started_at).heldQuantity +=
      hold.quantity;
  }
  for (const saved of row.customer_saved_products) {
    touch(saved.products, saved.created_at).saved = true;
  }
  return [...relationships.values()].toSorted(
    (left, right) => Date.parse(right.lastInteractionAt) - Date.parse(left.lastInteractionAt),
  );
}

type ProductProjection = CustomerProfileRow["holds"][number]["products"];

function mapTimeline(row: CustomerProfileRow): CustomerTimelineEvent[] {
  const events: CustomerTimelineEvent[] = [];
  for (const order of row.orders) {
    const unitCount = order.order_lines.reduce((total, line) => total + line.quantity, 0);
    events.push({
      id: `customer-order-${order.id}`,
      kind: "order",
      occurredAt: order.placed_at.toISOString(),
      title: order.source === "offline-sale" ? `Offline sale ${order.order_number}` : `Order ${order.order_number} placed`,
      detail: `${unitCount} unit${unitCount === 1 ? "" : "s"} · ${(order.channel ?? "other").replaceAll("_", "-")} · ${order.payment_status.replaceAll("_", "-")}`,
      orderId: order.order_number,
    });
    for (const payment of order.order_payment_events) {
      events.push({
        id: `customer-payment-${payment.id}`,
        kind: "payment",
        occurredAt: payment.occurred_at.toISOString(),
        title: `Payment ${(payment.status ?? payment.kind).replaceAll("_", "-")}`,
        detail: payment.note ?? "Payment state recorded.",
        orderId: order.order_number,
      });
    }
    for (const event of order.order_timeline_events) {
      const status = event.status.replaceAll("_", "-");
      events.push({
        id: `customer-order-event-${event.id}`,
        kind: ["dispatched", "out-for-delivery", "delivered"].includes(status) ? "delivery" : "order",
        occurredAt: event.occurred_at.toISOString(),
        title: `Order ${status}`,
        detail: event.note ?? "Order status updated.",
        orderId: order.order_number,
      });
    }
    for (const record of order.returns) {
      events.push({
        id: `customer-return-${record.id}`,
        kind: "return",
        occurredAt: record.requested_at.toISOString(),
        title: `Return ${record.id} requested`,
        detail: record.reason ?? "Customer requested a return.",
        orderId: order.order_number,
        returnId: record.id,
      });
      if (record.updated_at.getTime() !== record.requested_at.getTime()) {
        events.push({
          id: `customer-return-update-${record.id}`,
          kind: "return",
          occurredAt: record.updated_at.toISOString(),
          title: `Return ${record.status.replaceAll("_", "-")}`,
          detail: record.note ?? "Return record updated.",
          orderId: order.order_number,
          returnId: record.id,
        });
      }
    }
    for (const line of order.order_lines) {
      if (!line.product_review) continue;
      events.push({
        id: `customer-review-${line.product_review.id}`,
        kind: "review",
        occurredAt: line.product_review.created_at.toISOString(),
        title: `${line.product_review.rating}-star product review`,
        detail: line.product_review.title ?? "Product review submitted.",
        productId: line.product_id,
      });
    }
  }
  for (const hold of row.holds) {
    events.push({
      id: `customer-hold-${hold.id}`,
      kind: "hold",
      occurredAt: hold.started_at.toISOString(),
      title: "Product hold started",
      detail: `${hold.quantity} unit${hold.quantity === 1 ? "" : "s"} · ${hold.source.replaceAll("_", "-")}`,
      productId: hold.product_id,
      holdId: hold.id,
    });
    if (hold.released_at) {
      events.push({
        id: `customer-hold-release-${hold.id}`,
        kind: "hold",
        occurredAt: hold.released_at.toISOString(),
        title: "Product hold released",
        detail: hold.note ?? "Reserved stock returned to available inventory.",
        productId: hold.product_id,
        holdId: hold.id,
      });
    }
    if (hold.orders) {
      events.push({
        id: `customer-hold-conversion-${hold.id}`,
        kind: "hold",
        occurredAt: (hold.converted_at ?? hold.started_at).toISOString(),
        title: "Hold converted to order",
        detail: `Created ${hold.orders.order_number}.`,
        productId: hold.product_id,
        holdId: hold.id,
        orderId: hold.orders.order_number,
      });
    }
  }
  for (const activity of row.activity_events) {
    if (activity.kind !== "customer" && activity.kind !== "delivery") continue;
    events.push({
      id: `customer-activity-${activity.id}`,
      kind: activity.kind,
      occurredAt: activity.occurred_at.toISOString(),
      title: activity.title,
      detail: activity.detail ?? "Customer activity recorded.",
      ...(activity.order_id ? { orderId: activity.order_id } : {}),
      ...(activity.product_id ? { productId: activity.product_id } : {}),
    });
  }
  return events.toSorted(
    (left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt),
  );
}

function isPaidOrder(order: CustomerProfileRow["orders"][number]) {
  return (
    ["paid", "partially_refunded", "refunded"].includes(order.payment_status) &&
    order.fulfilment_status !== "cancelled"
  );
}

function mapOrderStatus(order: CustomerProfileRow["orders"][number]): OrderStatus {
  const latest = order.order_timeline_events.at(-1)?.status.replaceAll("_", "-");
  if (latest === "out-for-delivery") return "out-for-delivery";
  if (order.fulfilment_status === "cancelled") return "cancelled";
  if (order.fulfilment_status === "returned" || order.fulfilment_status === "partially_returned") return "returned";
  if (order.payment_status === "refunded" || order.payment_status === "partially_refunded") return "refunded";
  if (order.fulfilment_status === "delivered") return "delivered";
  if (order.fulfilment_status === "dispatched") return "dispatched";
  if (order.fulfilment_status === "ready_for_dispatch") return order.fulfilment_method === "pickup" ? "ready-for-pickup" : "packed";
  if (order.fulfilment_status === "processing") return "preparing";
  return order.payment_status === "paid" ? "payment-confirmed" : "pending-payment";
}

function mapDeliveryAddress(value: Prisma.JsonValue | null): DeliveryAddress | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, Prisma.JsonValue>;
  return {
    line1: stringValue(record.line1),
    line2: stringValue(record.line2),
    city: stringValue(record.city),
    state: stringValue(record.state),
    country: "Nigeria",
  };
}

function stringValue(value: Prisma.JsonValue | undefined) {
  return typeof value === "string" ? value : "";
}
