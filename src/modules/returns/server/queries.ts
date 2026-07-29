import "server-only";

import type { Prisma } from "@/lib/prisma";
import { prisma } from "@/lib/prisma";
import { adminReturnInclude, mapAdminReturnRow } from "@/modules/returns/server/mappers";
import type {
  AdminReturnListResult,
  EligibleReturnOrder,
  ReturnListInput,
  ReturnSavedView,
  ReturnStatus,
} from "@/modules/returns/types";

const resolvedStatuses: ReturnStatus[] = ["restocked", "damaged", "rejected", "closed"];

export async function listAdminReturns(input: ReturnListInput): Promise<AdminReturnListResult> {
  const where = buildReturnWhere(input);
  const orderBy = returnOrderBy(input.sort);
  const skip = (input.page - 1) * input.pageSize;

  const [rows, total, counts, totalReturns, openReturns, awaitingItem, inspecting, refundValue] =
    await Promise.all([
      prisma.returns.findMany({
        where,
        orderBy,
        skip,
        take: input.pageSize,
        include: adminReturnInclude,
      }),
      prisma.returns.count({ where }),
      getReturnSavedViewCounts(),
      prisma.returns.count(),
      prisma.returns.count({ where: viewWhere("open") }),
      prisma.returns.count({ where: viewWhere("awaiting-item") }),
      prisma.returns.count({ where: viewWhere("inspection") }),
      prisma.returns.aggregate({
        where: { status: { notIn: ["rejected", "cancelled"] } },
        _sum: { refund_amount: true },
      }),
    ]);

  return {
    data: rows.map(mapAdminReturnRow),
    meta: {
      page: input.page,
      pageSize: input.pageSize,
      total,
      pageCount: Math.max(1, Math.ceil(total / input.pageSize)),
      counts,
      summary: {
        totalReturns,
        openReturns,
        awaitingItem,
        inspecting,
        refundValue: refundValue._sum.refund_amount?.toNumber() ?? 0,
      },
    },
  };
}

export async function getAdminReturn(returnId: string) {
  const row = await prisma.returns.findUnique({
    where: { id: returnId },
    include: adminReturnInclude,
  });
  return row ? mapAdminReturnRow(row) : null;
}

export async function listEligibleReturnOrders(customerId?: string): Promise<EligibleReturnOrder[]> {
  const rows = await prisma.orders.findMany({
    where: {
      fulfilment_status: { in: ["delivered", "partially_returned"] },
      ...(customerId ? { customer_id: customerId } : {}),
    },
    orderBy: { placed_at: "desc" },
    take: 100,
    include: {
      customer: true,
      order_lines: {
        orderBy: { id: "asc" },
        include: {
          products: { select: { name: true } },
          product_variants: { select: { label: true } },
          return_lines: { include: { return: { select: { status: true } } } },
        },
      },
    },
  });

  return rows.flatMap((order) => {
    const lines = order.order_lines.flatMap((line) => {
      const alreadyReturned = line.return_lines
        .filter(
          (entry) => entry.return.status !== "rejected" && entry.return.status !== "cancelled",
        )
        .reduce((total, entry) => total + entry.quantity, 0);
      const eligibleQuantity = Math.max(0, line.quantity - alreadyReturned);
      if (!eligibleQuantity) return [];
      return [
        {
          id: line.id,
          productId: line.product_id,
          ...(line.variant_id ? { variantId: line.variant_id } : {}),
          productName: line.product_name || line.products.name,
          ...(line.variant_label || line.product_variants?.label
            ? { variantLabel: line.variant_label ?? line.product_variants?.label ?? undefined }
            : {}),
          quantity: line.quantity,
          eligibleQuantity,
          unitPrice: line.unit_price.toNumber(),
        },
      ];
    });
    if (!lines.length) return [];
    return [
      {
        id: order.order_number,
        databaseId: order.id,
        customerName: order.customer_name ?? order.customer.name,
        total: order.total.toNumber(),
        deliveryCity: order.delivery_city ?? order.customer.city ?? "",
        lines,
      },
    ];
  });
}

async function getReturnSavedViewCounts() {
  const views: ReturnSavedView[] = [
    "all",
    "open",
    "awaiting-item",
    "inspection",
    "refund",
    "resolved",
  ];
  const values = await Promise.all(
    views.map((view) => prisma.returns.count({ where: viewWhere(view) })),
  );
  return Object.fromEntries(views.map((view, index) => [view, values[index] ?? 0])) as Record<
    ReturnSavedView,
    number
  >;
}

function buildReturnWhere(input: ReturnListInput): Prisma.returnsWhereInput {
  const clauses: Prisma.returnsWhereInput[] = [viewWhere(input.view)];
  if (input.status !== "all") clauses.push(statusWhere(input.status));
  const search = input.search.trim();
  if (search) clauses.push(searchWhere(search));
  return clauses.length === 1 ? (clauses[0] ?? {}) : { AND: clauses };
}

function searchWhere(search: string): Prisma.returnsWhereInput {
  const contains = { contains: search, mode: "insensitive" as const };
  const or: Prisma.returnsWhereInput[] = [
    { reason: contains },
    { note: contains },
    { order: { order_number: contains } },
    { order: { customer_name: contains } },
    { order: { customer: { name: contains } } },
    {
      return_lines: {
        some: {
          order_line: {
            OR: [{ product_name: contains }, { variant_label: contains }, { sku: contains }],
          },
        },
      },
    },
  ];
  if (isUuid(search)) or.unshift({ id: search });
  return { OR: or };
}

function viewWhere(view: ReturnSavedView): Prisma.returnsWhereInput {
  switch (view) {
    case "all":
      return {};
    case "open":
      return {
        OR: [
          { status: { in: ["requested", "approved", "received", "inspecting"] } },
          statusWhere("refunded"),
        ],
      };
    case "awaiting-item":
      return { status: { in: ["requested", "approved"] } };
    case "inspection":
      return { status: { in: ["received", "inspecting"] } };
    case "refund":
      return statusWhere("refunded");
    case "resolved":
      return { OR: resolvedStatuses.map(statusWhere) };
  }
}

function statusWhere(status: ReturnStatus): Prisma.returnsWhereInput {
  switch (status) {
    case "requested":
    case "approved":
    case "received":
    case "inspecting":
    case "rejected":
      return { status };
    case "refunded":
      return {
        status: "completed",
        completed_at: null,
        return_lines: { every: { disposition: "pending" } },
      };
    case "restocked":
      return {
        status: "completed",
        completed_at: null,
        return_lines: { some: { disposition: "restock" }, every: { disposition: "restock" } },
      };
    case "damaged":
      return {
        status: "completed",
        completed_at: null,
        return_lines: { some: { disposition: "damaged" }, every: { disposition: "damaged" } },
      };
    case "closed":
      return { status: "completed", completed_at: { not: null } };
  }
}

function returnOrderBy(sort: ReturnListInput["sort"]): Prisma.returnsOrderByWithRelationInput {
  switch (sort) {
    case "updated-desc":
      return { updated_at: "desc" };
    case "requested-desc":
      return { requested_at: "desc" };
    case "value-desc":
      return { refund_amount: "desc" };
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
