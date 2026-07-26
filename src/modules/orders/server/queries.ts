import "server-only";

import { createPaginationMeta } from "@/lib/http/pagination";
import type { Prisma } from "@/lib/prisma";
import { prisma } from "@/lib/prisma";
import { adminOrderInclude, mapAdminOrderRow } from "@/modules/orders/server/mappers";
import type {
  AdminOrderListResult,
  ControlRoomOrder,
  OrderListInput,
  OrderPaymentFilter,
  OrderSavedView,
  OrderSavedViewCounts,
  OrderWorkspaceSummary,
} from "@/modules/orders/types";

const fulfilmentDatabaseStatuses = ["processing", "ready_for_dispatch", "dispatched"] as const;
const closedDatabaseStatuses = ["cancelled", "returned", "partially_returned"] as const;

export async function listAdminOrders(input: OrderListInput): Promise<AdminOrderListResult> {
  const where = buildOrderWhere(input);
  const orderBy = buildOrderSort(input.sort);

  const [rows, total, counts, summary] = await Promise.all([
    prisma.orders.findMany({
      where,
      include: adminOrderInclude,
      orderBy,
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
    }),
    prisma.orders.count({ where }),
    getOrderSavedViewCounts(),
    getOrderWorkspaceSummary(),
  ]);

  return {
    data: rows.map(mapAdminOrderRow),
    meta: {
      ...createPaginationMeta({ page: input.page, pageSize: input.pageSize, total }),
      counts,
      summary,
    },
  };
}

export async function getAdminOrder(identifier: string): Promise<ControlRoomOrder | null> {
  const row = await prisma.orders.findFirst({
    where: orderIdentifierWhere(identifier),
    include: adminOrderInclude,
  });
  return row ? mapAdminOrderRow(row) : null;
}

export function orderIdentifierWhere(identifier: string): Prisma.ordersWhereInput {
  const normalized = identifier.trim();
  return isUuid(normalized)
    ? { OR: [{ id: normalized }, { order_number: normalized }] }
    : { order_number: normalized };
}

function buildOrderWhere(input: OrderListInput): Prisma.ordersWhereInput {
  const clauses: Prisma.ordersWhereInput[] = [];
  const view = savedViewWhere(input.view);
  if (view) clauses.push(view);

  if (input.channel === "online") clauses.push({ channel: "online" });
  if (input.channel === "offline") clauses.push({ NOT: { channel: "online" } });

  const payment = paymentWhere(input.payment);
  if (payment) clauses.push(payment);

  if (input.search) {
    const contains = { contains: input.search, mode: "insensitive" as const };
    clauses.push({
      OR: [
        { order_number: contains },
        { customer_name: contains },
        { customer_email: contains },
        { delivery_city: contains },
        { channel: contains },
        { customer: { is: { name: contains } } },
        { customer: { is: { email: contains } } },
        { customer: { is: { phone: contains } } },
        {
          order_lines: {
            some: {
              OR: [{ product_name: contains }, { variant_label: contains }, { sku: contains }],
            },
          },
        },
      ],
    });
  }

  return clauses.length ? { AND: clauses } : {};
}

function savedViewWhere(view: OrderSavedView): Prisma.ordersWhereInput | null {
  switch (view) {
    case "all":
      return null;
    case "needs-attention":
      return { attention: { not: null } };
    case "pending-payment":
      return { payment_status: { in: ["pending", "processing", "review_required"] } };
    case "fulfilment":
      return { fulfilment_status: { in: [...fulfilmentDatabaseStatuses] } };
    case "delivered":
      return { fulfilment_status: "delivered" };
    case "closed":
      return {
        OR: [
          { fulfilment_status: { in: [...closedDatabaseStatuses] } },
          { payment_status: { in: ["partially_refunded", "refunded", "cancelled"] } },
        ],
      };
  }
}

function paymentWhere(payment: OrderPaymentFilter): Prisma.ordersWhereInput | null {
  switch (payment) {
    case "all":
      return null;
    case "pending":
      return { payment_status: "pending" };
    case "deposit":
      return { payment_status: "processing" };
    case "paid":
      return { payment_status: "paid" };
    case "failed":
      return { payment_status: { in: ["review_required", "cancelled"] } };
    case "refunded":
      return { payment_status: { in: ["partially_refunded", "refunded"] } };
  }
}

function buildOrderSort(sort: OrderListInput["sort"]): Prisma.ordersOrderByWithRelationInput[] {
  switch (sort) {
    case "placed-asc":
      return [{ placed_at: "asc" }, { order_number: "asc" }];
    case "total-desc":
      return [{ total: "desc" }, { order_number: "asc" }];
    case "total-asc":
      return [{ total: "asc" }, { order_number: "asc" }];
    case "placed-desc":
      return [{ placed_at: "desc" }, { order_number: "desc" }];
  }
}

async function getOrderSavedViewCounts(): Promise<OrderSavedViewCounts> {
  const [all, needsAttention, pendingPayment, fulfilment, delivered, closed] =
    await prisma.$transaction([
      prisma.orders.count(),
      prisma.orders.count({ where: { attention: { not: null } } }),
      prisma.orders.count({
        where: { payment_status: { in: ["pending", "processing", "review_required"] } },
      }),
      prisma.orders.count({
        where: { fulfilment_status: { in: [...fulfilmentDatabaseStatuses] } },
      }),
      prisma.orders.count({ where: { fulfilment_status: "delivered" } }),
      prisma.orders.count({
        where: {
          OR: [
            { fulfilment_status: { in: [...closedDatabaseStatuses] } },
            { payment_status: { in: ["partially_refunded", "refunded", "cancelled"] } },
          ],
        },
      }),
    ]);

  return {
    all,
    "needs-attention": needsAttention,
    "pending-payment": pendingPayment,
    fulfilment,
    delivered,
    closed,
  };
}

async function getOrderWorkspaceSummary(): Promise<OrderWorkspaceSummary> {
  const [totalOrders, needsAttention, pendingPayment, inFulfilment, delivered, revenue] =
    await prisma.$transaction([
      prisma.orders.count(),
      prisma.orders.count({ where: { attention: { not: null } } }),
      prisma.orders.count({
        where: { payment_status: { in: ["pending", "processing", "review_required"] } },
      }),
      prisma.orders.count({
        where: { fulfilment_status: { in: [...fulfilmentDatabaseStatuses] } },
      }),
      prisma.orders.count({ where: { fulfilment_status: "delivered" } }),
      prisma.orders.aggregate({
        where: {
          payment_status: { in: ["paid", "partially_refunded", "refunded"] },
          fulfilment_status: { not: "cancelled" },
        },
        _sum: { total: true, refunded_amount: true },
      }),
    ]);

  const gross = revenue._sum.total?.toNumber() ?? 0;
  const refunded = revenue._sum.refunded_amount?.toNumber() ?? 0;
  return {
    totalOrders,
    needsAttention,
    pendingPayment,
    inFulfilment,
    delivered,
    netRevenue: Math.max(0, gross - refunded),
  };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
