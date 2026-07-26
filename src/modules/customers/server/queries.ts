import "server-only";

import { Prisma, prisma } from "@/lib/prisma";
import {
  type CustomerMetricProjection,
  customerProfileInclude,
  mapCustomerProfile,
} from "@/modules/customers/server/mappers";
import type {
  AdminCustomerListResult,
  CustomerListInput,
  CustomerRelationshipProfile,
} from "@/modules/customers/types";

const metricsCte = Prisma.sql`
WITH order_metrics AS (
  SELECT
    o.customer_id,
    COUNT(*)::int AS order_count,
    COUNT(*) FILTER (
      WHERE o.payment_status IN ('paid', 'partially_refunded', 'refunded')
        AND o.fulfilment_status <> 'cancelled'
    )::int AS paid_order_count,
    COALESCE(SUM(
      CASE
        WHEN o.payment_status IN ('paid', 'partially_refunded', 'refunded')
          AND o.fulfilment_status <> 'cancelled'
        THEN GREATEST(o.total - o.refunded_amount, 0)
        ELSE 0
      END
    ), 0)::numeric AS lifetime_spend,
    COUNT(*) FILTER (WHERE o.fulfilment_status = 'cancelled')::int AS cancellation_count,
    MAX(o.placed_at) FILTER (
      WHERE o.payment_status IN ('paid', 'partially_refunded', 'refunded')
        AND o.fulfilment_status <> 'cancelled'
    ) AS last_purchase_at,
    COALESCE(BOOL_OR(o.attention = 'payment' OR o.payment_status = 'review_required'), false) AS payment_attention,
    COALESCE(BOOL_OR(o.attention = 'delivery'), false) AS delivery_attention
  FROM orders o
  GROUP BY o.customer_id
),
hold_metrics AS (
  SELECT
    h.customer_id,
    COUNT(*) FILTER (WHERE h.status = 'active' AND h.expires_at > NOW())::int AS active_hold_count,
    COALESCE(BOOL_OR(
      h.status = 'active'
      AND h.expires_at > NOW()
      AND (h.expires_at <= NOW() + INTERVAL '5 minutes' OR h.payment_progress = 'failed')
    ), false) AS hold_attention
  FROM holds h
  GROUP BY h.customer_id
),
return_metrics AS (
  SELECT
    o.customer_id,
    COUNT(r.id) FILTER (WHERE r.status NOT IN ('rejected', 'cancelled'))::int AS return_count,
    COALESCE(BOOL_OR(r.status IN ('requested', 'approved', 'received', 'inspecting')), false) AS return_attention
  FROM orders o
  LEFT JOIN returns r ON r.order_id = o.id
  GROUP BY o.customer_id
),
review_metrics AS (
  SELECT o.customer_id, COUNT(pr.id)::int AS review_count
  FROM orders o
  JOIN order_lines ol ON ol.order_id = o.id
  LEFT JOIN product_reviews pr ON pr.order_line_id = ol.id
  GROUP BY o.customer_id
),
customer_metrics AS (
  SELECT
    c.id,
    c.name,
    c.email,
    c.phone,
    c.city,
    c.type,
    c.created_at,
    COALESCE(om.order_count, 0)::int AS order_count,
    COALESCE(om.paid_order_count, 0)::int AS paid_order_count,
    COALESCE(om.lifetime_spend, 0)::numeric AS lifetime_spend,
    COALESCE(om.cancellation_count, 0)::int AS cancellation_count,
    om.last_purchase_at,
    COALESCE(om.payment_attention, false) AS payment_attention,
    COALESCE(om.delivery_attention, false) AS delivery_attention,
    COALESCE(hm.active_hold_count, 0)::int AS active_hold_count,
    COALESCE(hm.hold_attention, false) AS hold_attention,
    COALESCE(rm.return_count, 0)::int AS return_count,
    COALESCE(rm.return_attention, false) AS return_attention,
    COALESCE(vm.review_count, 0)::int AS review_count
  FROM customers c
  LEFT JOIN order_metrics om ON om.customer_id = c.id
  LEFT JOIN hold_metrics hm ON hm.customer_id = c.id
  LEFT JOIN return_metrics rm ON rm.customer_id = c.id
  LEFT JOIN review_metrics vm ON vm.customer_id = c.id
)
`;

type CustomerMetricRow = {
  id: string;
  order_count: number;
  paid_order_count: number;
  lifetime_spend: Prisma.Decimal;
  cancellation_count: number;
  last_purchase_at: Date | null;
  payment_attention: boolean;
  delivery_attention: boolean;
  active_hold_count: number;
  hold_attention: boolean;
  return_count: number;
  return_attention: boolean;
  review_count: number;
  total_count: number;
};

type CustomerSummaryRow = {
  total_customers: number;
  relationship_value: Prisma.Decimal;
  needs_attention: number;
  returning_customers: number;
  active_holds: number;
  all_count: number;
  attention_count: number;
  returning_count: number;
  high_value_count: number;
  new_count: number;
};

export async function listAdminCustomers(
  input: CustomerListInput,
): Promise<AdminCustomerListResult> {
  const filters = customerFilters(input);
  const rows = await prisma.$queryRaw<CustomerMetricRow[]>(Prisma.sql`
    ${metricsCte}
    SELECT
      cm.id,
      cm.order_count,
      cm.paid_order_count,
      cm.lifetime_spend,
      cm.cancellation_count,
      cm.last_purchase_at,
      cm.payment_attention,
      cm.delivery_attention,
      cm.active_hold_count,
      cm.hold_attention,
      cm.return_count,
      cm.return_attention,
      cm.review_count,
      COUNT(*) OVER()::int AS total_count
    FROM customer_metrics cm
    WHERE TRUE
      ${filters}
    ${customerOrderBy(input.sort)}
    LIMIT ${input.pageSize}
    OFFSET ${(input.page - 1) * input.pageSize}
  `);

  const [summary] = await prisma.$queryRaw<CustomerSummaryRow[]>(Prisma.sql`
    ${metricsCte}
    SELECT
      COUNT(*)::int AS total_customers,
      COALESCE(SUM(lifetime_spend), 0)::numeric AS relationship_value,
      COUNT(*) FILTER (
        WHERE payment_attention OR delivery_attention OR return_attention OR hold_attention
      )::int AS needs_attention,
      COUNT(*) FILTER (WHERE order_count >= 2)::int AS returning_customers,
      COALESCE(SUM(active_hold_count), 0)::int AS active_holds,
      COUNT(*)::int AS all_count,
      COUNT(*) FILTER (
        WHERE payment_attention OR delivery_attention OR return_attention OR hold_attention
      )::int AS attention_count,
      COUNT(*) FILTER (WHERE order_count >= 2)::int AS returning_count,
      COUNT(*) FILTER (WHERE lifetime_spend >= 50000)::int AS high_value_count,
      COUNT(*) FILTER (WHERE order_count < 2)::int AS new_count
    FROM customer_metrics
  `);

  const ids = rows.map((row) => row.id);
  const customerRows = ids.length
    ? await prisma.customers.findMany({
        where: { id: { in: ids } },
        include: customerProfileInclude,
      })
    : [];
  const byId = new Map(customerRows.map((row) => [row.id, row]));
  const data = rows.flatMap((metricRow) => {
    const row = byId.get(metricRow.id);
    return row ? [mapCustomerProfile(row, metricProjection(metricRow))] : [];
  });
  const total = rows[0]?.total_count ?? 0;
  const safeSummary = summary ?? emptySummaryRow();

  return {
    data,
    meta: {
      page: input.page,
      pageSize: input.pageSize,
      total,
      pageCount: Math.max(1, Math.ceil(total / input.pageSize)),
      counts: {
        all: safeSummary.all_count,
        "needs-attention": safeSummary.attention_count,
        returning: safeSummary.returning_count,
        "high-value": safeSummary.high_value_count,
        new: safeSummary.new_count,
      },
      summary: {
        totalCustomers: safeSummary.total_customers,
        relationshipValue: safeSummary.relationship_value.toNumber(),
        needsAttention: safeSummary.needs_attention,
        returningCustomers: safeSummary.returning_customers,
        activeHolds: safeSummary.active_holds,
      },
    },
  };
}

export async function getAdminCustomer(
  customerId: string,
): Promise<CustomerRelationshipProfile | null> {
  const row = await prisma.customers.findUnique({
    where: { id: customerId },
    include: customerProfileInclude,
  });
  if (!row) return null;
  const metrics = await getCustomerMetric(customerId);
  return mapCustomerProfile(row, metrics);
}

export async function getCustomerMetric(customerId: string): Promise<CustomerMetricProjection> {
  const [row] = await prisma.$queryRaw<CustomerMetricRow[]>(Prisma.sql`
    ${metricsCte}
    SELECT
      cm.id,
      cm.order_count,
      cm.paid_order_count,
      cm.lifetime_spend,
      cm.cancellation_count,
      cm.last_purchase_at,
      cm.payment_attention,
      cm.delivery_attention,
      cm.active_hold_count,
      cm.hold_attention,
      cm.return_count,
      cm.return_attention,
      cm.review_count,
      1::int AS total_count
    FROM customer_metrics cm
    WHERE cm.id = ${customerId}::uuid
  `);
  return row ? metricProjection(row) : emptyMetricProjection();
}

function customerFilters(input: CustomerListInput) {
  const clauses: Prisma.Sql[] = [];
  if (input.type !== "all") clauses.push(Prisma.sql`AND cm.type = ${input.type}`);
  if (input.view === "needs-attention") {
    clauses.push(
      Prisma.sql`AND (cm.payment_attention OR cm.delivery_attention OR cm.return_attention OR cm.hold_attention)`,
    );
  } else if (input.view === "returning") {
    clauses.push(Prisma.sql`AND cm.order_count >= 2`);
  } else if (input.view === "high-value") {
    clauses.push(Prisma.sql`AND cm.lifetime_spend >= 50000`);
  } else if (input.view === "new") {
    clauses.push(Prisma.sql`AND cm.order_count < 2`);
  }
  const search = input.search.trim();
  if (search) {
    const pattern = `%${search}%`;
    clauses.push(Prisma.sql`AND (
      cm.name ILIKE ${pattern}
      OR COALESCE(cm.email, '') ILIKE ${pattern}
      OR COALESCE(cm.phone, '') ILIKE ${pattern}
      OR COALESCE(cm.city, '') ILIKE ${pattern}
      OR cm.type ILIKE ${pattern}
      OR EXISTS (
        SELECT 1 FROM customer_addresses ca
        WHERE ca.customer_id = cm.id
          AND CONCAT_WS(' ', ca.label, ca.line1, ca.line2, ca.city, ca.state) ILIKE ${pattern}
      )
      OR EXISTS (
        SELECT 1 FROM orders o
        JOIN order_lines ol ON ol.order_id = o.id
        WHERE o.customer_id = cm.id
          AND CONCAT_WS(' ', o.order_number, ol.product_name, ol.variant_label, ol.sku) ILIKE ${pattern}
      )
    )`);
  }
  return clauses.length ? Prisma.join(clauses, " ") : Prisma.empty;
}

function customerOrderBy(sort: CustomerListInput["sort"]) {
  switch (sort) {
    case "spend-desc":
      return Prisma.sql`ORDER BY cm.lifetime_spend DESC, cm.order_count DESC, cm.name ASC`;
    case "recent-desc":
      return Prisma.sql`ORDER BY cm.last_purchase_at DESC NULLS LAST, cm.created_at DESC`;
    case "orders-desc":
      return Prisma.sql`ORDER BY cm.order_count DESC, cm.lifetime_spend DESC, cm.name ASC`;
    case "name-asc":
      return Prisma.sql`ORDER BY cm.name ASC`;
  }
}

function metricProjection(row: CustomerMetricRow): CustomerMetricProjection {
  return {
    lifetimeSpend: row.lifetime_spend.toNumber(),
    orderCount: row.order_count,
    paidOrderCount: row.paid_order_count,
    returnCount: row.return_count,
    cancellationCount: row.cancellation_count,
    activeHoldCount: row.active_hold_count,
    reviewCount: row.review_count,
    lastPurchaseAt: row.last_purchase_at,
    paymentAttention: row.payment_attention,
    deliveryAttention: row.delivery_attention,
    returnAttention: row.return_attention,
    holdAttention: row.hold_attention,
  };
}

function emptyMetricProjection(): CustomerMetricProjection {
  return {
    lifetimeSpend: 0,
    orderCount: 0,
    paidOrderCount: 0,
    returnCount: 0,
    cancellationCount: 0,
    activeHoldCount: 0,
    reviewCount: 0,
    lastPurchaseAt: null,
    paymentAttention: false,
    deliveryAttention: false,
    returnAttention: false,
    holdAttention: false,
  };
}

function emptySummaryRow(): CustomerSummaryRow {
  return {
    total_customers: 0,
    relationship_value: new Prisma.Decimal(0),
    needs_attention: 0,
    returning_customers: 0,
    active_holds: 0,
    all_count: 0,
    attention_count: 0,
    returning_count: 0,
    high_value_count: 0,
    new_count: 0,
  };
}
