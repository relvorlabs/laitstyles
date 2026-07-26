import "server-only";

import type {
  AdminActivity,
  AttentionItem,
  ContinueTask,
  FulfilmentLaneItem,
  SalesPulsePoint,
} from "@/lib/admin/shared/types";
import { Prisma, prisma } from "@/lib/prisma";
import { adminOrderInclude, mapAdminOrderRow } from "@/modules/orders/server/mappers";
import type {
  OverviewData,
  OverviewInventoryItem,
  OverviewOpenOrder,
} from "@/modules/overview/types";

const todayOrderInclude = {
  customer: { select: { name: true } },
  order_lines: { select: { quantity: true } },
} satisfies Prisma.ordersInclude;

type TodayOrderRow = Prisma.ordersGetPayload<{ include: typeof todayOrderInclude }>;

const expiringHoldInclude = {
  customers: { select: { name: true } },
  products: { select: { name: true } },
} satisfies Prisma.holdsInclude;

type ExpiringHoldRow = Prisma.holdsGetPayload<{ include: typeof expiringHoldInclude }>;

const continueProductInclude = {
  intake_record: { select: { stage: true, ready_for_listing: true } },
} satisfies Prisma.productsInclude;

type ContinueProductRow = Prisma.productsGetPayload<{ include: typeof continueProductInclude }>;

const overviewProductInclude = {
  product_variants: { select: { id: true } },
  stock_levels: { select: { available: true, reserved: true } },
  product_media: {
    where: { variant_id: null },
    orderBy: { position: "asc" },
    take: 1,
    include: { cloudinary_assets: true },
  },
} satisfies Prisma.productsInclude;

type OverviewProductRow = Prisma.productsGetPayload<{ include: typeof overviewProductInclude }>;
type AdminOrderRow = Prisma.ordersGetPayload<{ include: typeof adminOrderInclude }>;

export async function getOverviewData(): Promise<OverviewData> {
  const asOf = new Date();
  const reportingDate = lagosDate(asOf);
  const start = new Date(`${reportingDate}T00:00:00+01:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1_000);

  const [
    todayOrders,
    activeHoldCount,
    expiringHold,
    fulfilment,
    lowStock,
    unpublished,
    activities,
    openOrderRows,
    salesPulse,
    continueProduct,
  ] = await Promise.all([
    prisma.orders.findMany({
      where: { placed_at: { gte: start, lt: end } },
      orderBy: { placed_at: "desc" },
      include: todayOrderInclude,
    }),
    prisma.holds.count({ where: { status: "active", expires_at: { gt: asOf } } }),
    prisma.holds.findFirst({
      where: {
        status: "active",
        expires_at: { gt: asOf, lte: new Date(asOf.getTime() + 5 * 60 * 1_000) },
      },
      orderBy: { expires_at: "asc" },
      include: expiringHoldInclude,
    }),
    getFulfilmentLane(),
    getLowStockProducts(),
    getUnpublishedProducts(),
    prisma.activity_events.findMany({ orderBy: { occurred_at: "desc" }, take: 5 }),
    prisma.orders.findMany({
      where: {
        fulfilment_status: { notIn: ["delivered", "cancelled", "returned"] },
        payment_status: { notIn: ["cancelled", "refunded"] },
      },
      orderBy: { placed_at: "desc" },
      take: 5,
      include: adminOrderInclude,
    }),
    getSalesPulse(start),
    prisma.products.findFirst({
      where: {
        OR: [
          { lifecycle: { not: "active" } },
          { publication: { not: "published" } },
          { intake_record: { is: { ready_for_listing: false } } },
        ],
      },
      orderBy: { updated_at: "desc" },
      include: continueProductInclude,
    }),
  ]);

  const revenue = todayOrders.reduce(
    (totals, order) => {
      if (!isRecognisedRevenue(order)) return totals;
      const net = Math.max(0, order.total.toNumber() - order.refunded_amount.toNumber());
      totals.total += net;
      if (isOnlineOrder(order.source, order.channel)) totals.online += net;
      else totals.offline += net;
      return totals;
    },
    { total: 0, online: 0, offline: 0 },
  );
  const unitsSoldToday = todayOrders
    .filter(isRecognisedRevenue)
    .reduce(
      (total, order) =>
        total + order.order_lines.reduce((lineTotal, line) => lineTotal + line.quantity, 0),
      0,
    );
  const openOrders = await mapOpenOrders(openOrderRows);
  const attention = buildAttention({
    todayOrders,
    expiringHold,
    lowStock: lowStock.items[0],
    incomplete: unpublished.items[0],
    asOf,
  });
  const continueTask = mapContinueTask(continueProduct);

  return {
    reportingDate,
    asOf: asOf.toISOString(),
    salesPulse,
    openOrders,
    snapshot: {
      revenue,
      ordersToday: todayOrders.length,
      unitsSoldToday,
      activeHolds: activeHoldCount,
      attention,
      fulfilment,
      lowStockProducts: lowStock.items,
      lowStockCount: lowStock.total,
      unpublishedProducts: unpublished.items,
      unpublishedCount: unpublished.total,
      recentActivities: activities.map(mapActivity),
      ...(continueTask ? { continueTask } : {}),
    },
  };
}

function isRecognisedRevenue(order: TodayOrderRow) {
  return (
    ["paid", "partially_refunded", "refunded"].includes(order.payment_status) &&
    order.fulfilment_status !== "cancelled"
  );
}

function isOnlineOrder(source: string, channel: string | null) {
  return source === "online-order" || channel === "online" || channel === "storefront";
}

async function getFulfilmentLane(): Promise<FulfilmentLaneItem[]> {
  const [paid, preparing, packed, dispatched] = await Promise.all([
    prisma.orders.count({
      where: {
        payment_status: "paid",
        fulfilment_status: "unfulfilled",
      },
    }),
    prisma.orders.count({ where: { fulfilment_status: "processing" } }),
    prisma.orders.count({
      where: {
        fulfilment_status: "ready_for_dispatch",
        fulfilment_method: "delivery",
      },
    }),
    prisma.orders.count({ where: { fulfilment_status: "dispatched" } }),
  ]);
  return [
    { status: "payment-confirmed", label: "Paid", count: paid },
    { status: "preparing", label: "Preparing", count: preparing },
    { status: "packed", label: "Packed", count: packed },
    { status: "dispatched", label: "Dispatched", count: dispatched },
  ];
}

type LowStockRaw = {
  id: string;
  available: number;
  reserved: number;
  total_count: number;
};

async function getLowStockProducts() {
  const rows = await prisma.$queryRaw<LowStockRaw[]>(Prisma.sql`
    WITH stock AS (
      SELECT
        p.id,
        COALESCE(SUM(sl.available), 0)::int AS available,
        COALESCE(SUM(sl.reserved), 0)::int AS reserved
      FROM products p
      LEFT JOIN stock_levels sl ON sl.product_id = p.id
      WHERE p.lifecycle = 'active'
        AND p.inventory_mode <> 'unique'
      GROUP BY p.id, p.low_stock_threshold
      HAVING COALESCE(SUM(sl.available), 0) > 0
        AND COALESCE(SUM(sl.available), 0) <= p.low_stock_threshold
    )
    SELECT id, available, reserved, COUNT(*) OVER()::int AS total_count
    FROM stock
    ORDER BY available ASC, id ASC
    LIMIT 4
  `);
  const products = await getOverviewProducts(rows.map((row) => row.id));
  const byId = new Map(products.map((product) => [product.id, product]));
  return {
    total: rows[0]?.total_count ?? 0,
    items: rows.flatMap((row) => {
      const product = byId.get(row.id);
      return product
        ? [mapInventoryItem(product, { available: row.available, reserved: row.reserved })]
        : [];
    }),
  };
}

async function getUnpublishedProducts() {
  const where: Prisma.productsWhereInput = {
    OR: [{ lifecycle: { not: "active" } }, { publication: { not: "published" } }],
  };
  const [rows, total] = await Promise.all([
    prisma.products.findMany({
      where,
      orderBy: { updated_at: "desc" },
      take: 4,
      include: overviewProductInclude,
    }),
    prisma.products.count({ where }),
  ]);
  return {
    total,
    items: rows.map((row) => {
      const stock = row.stock_levels.reduce(
        (values, level) => ({
          available: values.available + level.available,
          reserved: values.reserved + level.reserved,
        }),
        { available: 0, reserved: 0 },
      );
      return mapInventoryItem(row, stock);
    }),
  };
}

async function getOverviewProducts(ids: string[]) {
  if (!ids.length) return [];
  return prisma.products.findMany({
    where: { id: { in: ids } },
    include: overviewProductInclude,
  });
}

function mapInventoryItem(
  row: OverviewProductRow,
  stock: { available: number; reserved: number },
): OverviewInventoryItem {
  const media = row.product_media[0]?.cloudinary_assets;
  return {
    id: row.id,
    name: row.name,
    image: media?.delivery_url ?? media?.secure_url ?? "/placeholder.svg",
    imageAlt: media?.alt || `${row.name} product image`,
    inventoryMode: row.inventory_mode,
    variantCount: row.product_variants.length,
    lifecycle: row.lifecycle,
    publication: row.publication,
    lowStockThreshold: row.low_stock_threshold,
    available: stock.available,
    reserved: stock.reserved,
  };
}

async function mapOpenOrders(rows: AdminOrderRow[]): Promise<OverviewOpenOrder[]> {
  const productIds = rows.flatMap((row) =>
    row.order_lines[0] ? [row.order_lines[0].product_id] : [],
  );
  const products = await getOverviewProducts([...new Set(productIds)]);
  const byId = new Map(products.map((product) => [product.id, product]));
  return rows.map((row) => {
    const order = mapAdminOrderRow(row);
    const firstLine = order.lines[0];
    const product = firstLine ? byId.get(firstLine.productId) : undefined;
    const media = product?.product_media[0]?.cloudinary_assets;
    return {
      order,
      customerName: order.customerLabel ?? order.customer?.name ?? "Customer",
      productName: firstLine?.productName ?? `${order.lines.length} order lines`,
      productImage: media?.delivery_url ?? media?.secure_url ?? null,
      productImageAlt: media?.alt || firstLine?.productName || "Order product",
    };
  });
}

type SalesPulseRow = { date: string; online: Prisma.Decimal; offline: Prisma.Decimal };

async function getSalesPulse(todayStart: Date): Promise<SalesPulsePoint[]> {
  const start = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1_000);
  const rows = await prisma.$queryRaw<SalesPulseRow[]>(Prisma.sql`
    WITH days AS (
      SELECT generate_series(${start}::date, ${todayStart}::date, INTERVAL '1 day')::date AS day
    ),
    revenue AS (
      SELECT
        (o.placed_at AT TIME ZONE 'Africa/Lagos')::date AS day,
        COALESCE(SUM(
          CASE WHEN o.source = 'online-order' OR o.channel IN ('online', 'storefront')
          THEN GREATEST(o.total - o.refunded_amount, 0) ELSE 0 END
        ), 0)::numeric AS online,
        COALESCE(SUM(
          CASE WHEN NOT (o.source = 'online-order' OR o.channel IN ('online', 'storefront'))
          THEN GREATEST(o.total - o.refunded_amount, 0) ELSE 0 END
        ), 0)::numeric AS offline
      FROM orders o
      WHERE o.payment_status IN ('paid', 'partially_refunded', 'refunded')
        AND o.fulfilment_status <> 'cancelled'
        AND o.placed_at >= ${start}
      GROUP BY (o.placed_at AT TIME ZONE 'Africa/Lagos')::date
    )
    SELECT
      TO_CHAR(days.day, 'YYYY-MM-DD') AS date,
      COALESCE(revenue.online, 0)::numeric AS online,
      COALESCE(revenue.offline, 0)::numeric AS offline
    FROM days
    LEFT JOIN revenue ON revenue.day = days.day
    ORDER BY days.day ASC
  `);
  return rows.map((row) => ({
    date: row.date,
    label: new Intl.DateTimeFormat("en-NG", {
      weekday: "short",
      timeZone: "Africa/Lagos",
    }).format(new Date(`${row.date}T12:00:00+01:00`)),
    online: row.online.toNumber(),
    offline: row.offline.toNumber(),
  }));
}

function buildAttention({
  todayOrders,
  expiringHold,
  lowStock,
  incomplete,
  asOf,
}: {
  todayOrders: TodayOrderRow[];
  expiringHold: ExpiringHoldRow | null;
  lowStock?: OverviewInventoryItem;
  incomplete?: OverviewInventoryItem;
  asOf: Date;
}): AttentionItem[] {
  const items: AttentionItem[] = [];
  for (const order of todayOrders) {
    if (order.payment_status === "review_required" || order.attention === "payment") {
      items.push({
        id: `attention-payment-${order.id}`,
        tone: "critical",
        eyebrow: "Payment issue",
        title: `${order.order_number} needs customer follow-up`,
        detail: `${order.customer_name ?? order.customer.name} · ${order.delivery_city ?? "No delivery city"}`,
        href: `/admin/orders?order=${order.order_number}`,
      });
      continue;
    }
    if (order.attention === "packing") {
      items.push({
        id: `attention-packing-${order.id}`,
        tone: "warning",
        eyebrow: "Packing queue",
        title: `${order.order_number} is paid but not packed`,
        detail: `${order.order_lines.length} line item${order.order_lines.length === 1 ? "" : "s"} · ${order.delivery_city ?? "No delivery city"}`,
        href: `/admin/orders?order=${order.order_number}`,
      });
    }
  }
  const delivery = todayOrders.find((order) => order.attention === "delivery");
  if (delivery) {
    items.push({
      id: `attention-delivery-${delivery.id}`,
      tone: "warning",
      eyebrow: "Delivery update",
      title: `${delivery.order_number} needs waybill review`,
      detail: `Dispatched to ${delivery.delivery_city ?? "customer"}`,
      href: `/admin/orders?order=${delivery.order_number}`,
    });
  }
  if (expiringHold) {
    const seconds = Math.max(
      0,
      Math.floor((expiringHold.expires_at.getTime() - asOf.getTime()) / 1_000),
    );
    items.push({
      id: `attention-hold-${expiringHold.id}`,
      tone: "info",
      eyebrow: "Hold releasing soon",
      title: `${expiringHold.products.name} is still reserved`,
      detail: `${expiringHold.customers.name} · ${formatCountdown(seconds)} remaining`,
      href: `/admin/holds?hold=${expiringHold.id}`,
    });
  }
  if (lowStock) {
    items.push({
      id: `attention-stock-${lowStock.id}`,
      tone: "warning",
      eyebrow: "Low stock",
      title: `${lowStock.name} has ${lowStock.available} available`,
      detail: `Threshold is ${lowStock.lowStockThreshold} units`,
      href: "/admin/inventory?view=low-stock",
    });
  }
  if (incomplete) {
    items.push({
      id: `attention-draft-${incomplete.id}`,
      tone: "info",
      eyebrow: "Continue intake",
      title: `${incomplete.name} is not ready to publish`,
      detail: "Measurements, condition or price still need review",
      href: `/admin/products?product=${incomplete.id}`,
    });
  }
  return items.slice(0, 5);
}

function mapContinueTask(product: ContinueProductRow | null): ContinueTask | undefined {
  if (!product) return undefined;
  const progress = product.intake_record?.ready_for_listing
    ? 85
    : product.intake_record?.stage === "photography"
      ? 55
      : product.intake_record?.stage === "grading"
        ? 35
        : 20;
  return {
    id: `continue-product-${product.id}`,
    type: "draft",
    title: `Finish ${product.name}`,
    detail: `${product.lifecycle.replaceAll("_", "-")} · ${product.publication.replaceAll("_", "-")}`,
    href: `/admin/products?product=${product.id}`,
    progress,
  };
}

function mapActivity(row: {
  id: string;
  kind: string;
  title: string;
  detail: string | null;
  occurred_at: Date;
  product_id: string | null;
  order_id: string | null;
  customer_id: string | null;
}): AdminActivity {
  const supported = new Set<AdminActivity["kind"]>([
    "order",
    "hold",
    "inventory",
    "delivery",
    "customer",
    "draft",
    "sale",
    "return",
    "settings",
  ]);
  return {
    id: row.id,
    kind: supported.has(row.kind as AdminActivity["kind"])
      ? (row.kind as AdminActivity["kind"])
      : "inventory",
    title: row.title,
    detail: row.detail ?? "Store activity recorded.",
    occurredAt: row.occurred_at.toISOString(),
    ...(row.product_id ? { productId: row.product_id } : {}),
    ...(row.order_id ? { orderId: row.order_id } : {}),
    ...(row.customer_id ? { customerId: row.customer_id } : {}),
  };
}

function lagosDate(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}
