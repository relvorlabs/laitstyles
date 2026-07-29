import "server-only";

import type { Prisma } from "@/lib/prisma";
import type { ControlRoomReturn, ReturnDisposition, ReturnStatus } from "@/modules/returns/types";

export const adminReturnInclude = {
  return_lines: {
    orderBy: { id: "asc" },
    include: {
      order_line: {
        include: {
          products: { select: { name: true } },
          product_variants: { select: { label: true } },
        },
      },
    },
  },
  order: { include: { customer: true } },
} satisfies Prisma.returnsInclude;

export type AdminReturnRow = Prisma.returnsGetPayload<{
  include: typeof adminReturnInclude;
}>;

export function mapDatabaseReturnStatus(row: AdminReturnRow): ReturnStatus {
  if (row.completed_at) return "closed";
  if (row.status === "completed") {
    const dispositions = row.return_lines.map((line) => line.disposition);
    if (dispositions.length && dispositions.every((value) => value === "restock")) {
      return "restocked";
    }
    if (dispositions.length && dispositions.every((value) => value === "damaged")) {
      return "damaged";
    }
    return "refunded";
  }
  if (row.status === "cancelled") return "rejected";
  return row.status;
}

function mapDisposition(
  value: AdminReturnRow["return_lines"][number]["disposition"],
): ReturnDisposition {
  if (value === "restock") return "restock";
  if (value === "damaged") return "damaged";
  return "pending";
}

export function mapAdminReturnRow(row: AdminReturnRow): ControlRoomReturn {
  return {
    id: row.id,
    databaseId: row.id,
    orderId: row.order.order_number,
    orderDatabaseId: row.order_id,
    customerId: row.order.customer_id,
    customerName: row.order.customer_name ?? row.order.customer.name,
    status: mapDatabaseReturnStatus(row),
    reason: row.reason ?? "Customer requested a return",
    requestedAt: row.requested_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    lines: row.return_lines.map((line) => ({
      id: line.id,
      orderLineId: line.order_line_id,
      productId: line.order_line.product_id,
      ...(line.order_line.variant_id ? { variantId: line.order_line.variant_id } : {}),
      productName: line.order_line.product_name || line.order_line.products.name,
      ...(line.order_line.variant_label || line.order_line.product_variants?.label
        ? {
            variantLabel:
              line.order_line.variant_label ?? line.order_line.product_variants?.label ?? undefined,
          }
        : {}),
      quantity: line.quantity,
      disposition: mapDisposition(line.disposition),
    })),
    refundAmount: row.refund_amount.toNumber(),
    note: row.note ?? "",
    orderTotal: row.order.total.toNumber(),
    orderPaymentStatus: row.order.payment_status.replaceAll("_", "-"),
    currency: row.order.currency,
  };
}
