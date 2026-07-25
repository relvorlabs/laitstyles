import "server-only";

import { Prisma, prisma } from "@/lib/prisma";
import type {
  InventoryProductListInput,
  InventoryProductPageIds,
  InventorySummary,
  InventoryViewCounts,
} from "@/modules/inventory/types";

const inventoryCte = Prisma.sql`
  WITH inventory AS (
    SELECT
      p.id,
      p.name,
      p.description,
      p.brand,
      p.archive_number,
      p.sku,
      p.lifecycle::text AS lifecycle,
      p.publication::text AS publication,
      p.inventory_mode::text AS inventory_mode,
      p.low_stock_threshold,
      p.price,
      p.updated_at,
      category.name AS category_name,
      collection.name AS collection_name,
      COALESCE((
        SELECT SUM(stock.total_received)
        FROM stock_levels stock
        WHERE stock.product_id = p.id
      ), 0)::int AS total_received,
      COALESCE((
        SELECT SUM(stock.available)
        FROM stock_levels stock
        WHERE stock.product_id = p.id
      ), 0)::int AS available,
      COALESCE((
        SELECT SUM(stock.reserved + stock.committed)
        FROM stock_levels stock
        WHERE stock.product_id = p.id
      ), 0)::int AS reserved,
      COALESCE((
        SELECT SUM(stock.sold)
        FROM stock_levels stock
        WHERE stock.product_id = p.id
      ), 0)::int AS sold,
      COALESCE((
        SELECT SUM(stock.returned)
        FROM stock_levels stock
        WHERE stock.product_id = p.id
      ), 0)::int AS returned,
      COALESCE((
        SELECT SUM(stock.damaged)
        FROM stock_levels stock
        WHERE stock.product_id = p.id
      ), 0)::int AS damaged,
      EXISTS (
        SELECT 1
        FROM stock_levels variant_stock
        WHERE variant_stock.product_id = p.id
          AND variant_stock.variant_id IS NOT NULL
          AND variant_stock.available > 0
          AND variant_stock.available <= p.low_stock_threshold
      ) AS variant_low_stock
    FROM products p
    LEFT JOIN catalogue_categories category ON category.id = p.category_id
    LEFT JOIN catalogue_collections collection ON collection.id = p.collection_id
  )
`;

const lowStockShapePredicate = Prisma.sql`
  i.inventory_mode <> 'unique'
  AND (
    (i.inventory_mode = 'variant' AND i.variant_low_stock)
    OR (
      i.inventory_mode <> 'variant'
      AND i.available > 0
      AND i.available <= i.low_stock_threshold
    )
  )
`;

const lowStockHealthPredicate = Prisma.sql`
  i.lifecycle = 'active'
  AND i.publication = 'published'
  AND (${lowStockShapePredicate})
`;

const fullySoldPredicate = Prisma.sql`
  i.total_received > 0
  AND i.sold = i.total_received
`;

const outOfStockHealthPredicate = Prisma.sql`
  i.lifecycle = 'active'
  AND i.publication = 'published'
  AND i.available = 0
  AND i.reserved = 0
  AND NOT (${fullySoldPredicate})
`;

const outOfStockAttentionPredicate = Prisma.sql`
  i.inventory_mode <> 'unique'
  AND i.available = 0
  AND i.reserved = 0
`;

const heldHealthPredicate = Prisma.sql`
  i.lifecycle = 'active'
  AND i.publication = 'published'
  AND i.available = 0
  AND i.reserved > 0
`;

const soldHealthPredicate = Prisma.sql`
  i.lifecycle = 'active'
  AND i.publication = 'published'
  AND i.available = 0
  AND i.reserved = 0
  AND (${fullySoldPredicate})
`;

const healthyPredicate = Prisma.sql`
  i.lifecycle = 'active'
  AND i.publication = 'published'
  AND NOT (${heldHealthPredicate})
  AND NOT (${soldHealthPredicate})
  AND NOT (${outOfStockHealthPredicate})
  AND NOT (${lowStockHealthPredicate})
`;

const needsAttentionPredicate = Prisma.sql`
  (${lowStockShapePredicate})
  OR (${outOfStockAttentionPredicate})
  OR i.damaged > 0
  OR i.returned > 0
  OR i.publication <> 'published'
  OR i.lifecycle IN ('draft', 'intake')
`;

type IdRow = { id: string };
type CountRow = { total: bigint | number };
type OverviewRow = {
  totalProducts: bigint | number;
  liveProducts: bigint | number;
  availableUnits: bigint | number;
  reservedUnits: bigint | number;
  soldUnits: bigint | number;
  lowStockProducts: bigint | number;
  outOfStockProducts: bigint | number;
  intakeProducts: bigint | number;
  allView: bigint | number;
  draftsView: bigint | number;
  heldView: bigint | number;
  soldView: bigint | number;
  unpublishedView: bigint | number;
  needsAttentionView: bigint | number;
};

export async function findInventoryProductPage(
  input: InventoryProductListInput,
): Promise<InventoryProductPageIds> {
  const where = buildWhere(input);
  const orderBy = inventoryOrderBy(input.sort);
  const offset = (input.page - 1) * input.pageSize;

  const [idRows, countRows, overviewRows] = await prisma.$transaction([
    prisma.$queryRaw<IdRow[]>(Prisma.sql`
      ${inventoryCte}
      SELECT i.id
      FROM inventory i
      WHERE ${where}
      ORDER BY ${orderBy}
      LIMIT ${input.pageSize}
      OFFSET ${offset}
    `),
    prisma.$queryRaw<CountRow[]>(Prisma.sql`
      ${inventoryCte}
      SELECT COUNT(*) AS total
      FROM inventory i
      WHERE ${where}
    `),
    prisma.$queryRaw<OverviewRow[]>(Prisma.sql`
      ${inventoryCte}
      SELECT
        COUNT(*) AS "totalProducts",
        COUNT(*) FILTER (
          WHERE i.lifecycle = 'active'
            AND i.publication = 'published'
            AND i.available > 0
        ) AS "liveProducts",
        COALESCE(SUM(i.available), 0) AS "availableUnits",
        COALESCE(SUM(i.reserved), 0) AS "reservedUnits",
        COALESCE(SUM(i.sold), 0) AS "soldUnits",
        COUNT(*) FILTER (WHERE ${lowStockHealthPredicate}) AS "lowStockProducts",
        COUNT(*) FILTER (WHERE ${outOfStockHealthPredicate}) AS "outOfStockProducts",
        COUNT(*) FILTER (WHERE i.lifecycle = 'intake') AS "intakeProducts",
        COUNT(*) AS "allView",
        COUNT(*) FILTER (WHERE i.lifecycle = 'draft') AS "draftsView",
        COUNT(*) FILTER (WHERE ${heldHealthPredicate}) AS "heldView",
        COUNT(*) FILTER (WHERE ${soldHealthPredicate}) AS "soldView",
        COUNT(*) FILTER (WHERE i.publication <> 'published') AS "unpublishedView",
        COUNT(*) FILTER (WHERE ${needsAttentionPredicate}) AS "needsAttentionView"
      FROM inventory i
    `),
  ]);

  const total = toNumber(countRows[0]?.total);
  const overview = overviewRows[0];
  const summary: InventorySummary = {
    totalProducts: toNumber(overview?.totalProducts),
    liveProducts: toNumber(overview?.liveProducts),
    availableUnits: toNumber(overview?.availableUnits),
    reservedUnits: toNumber(overview?.reservedUnits),
    soldUnits: toNumber(overview?.soldUnits),
    lowStockProducts: toNumber(overview?.lowStockProducts),
    outOfStockProducts: toNumber(overview?.outOfStockProducts),
    intakeProducts: toNumber(overview?.intakeProducts),
  };
  const viewCounts: InventoryViewCounts = {
    all: toNumber(overview?.allView),
    live: summary.liveProducts,
    drafts: toNumber(overview?.draftsView),
    intake: summary.intakeProducts,
    "low-stock": summary.lowStockProducts,
    "out-of-stock": summary.outOfStockProducts,
    held: toNumber(overview?.heldView),
    sold: toNumber(overview?.soldView),
    unpublished: toNumber(overview?.unpublishedView),
    "needs-attention": toNumber(overview?.needsAttentionView),
  };

  return {
    productIds: idRows.map((row) => row.id),
    pagination: {
      page: input.page,
      pageSize: input.pageSize,
      total,
      pageCount: Math.ceil(total / input.pageSize),
    },
    summary,
    viewCounts,
  };
}

function buildWhere(input: InventoryProductListInput): Prisma.Sql {
  const conditions: Prisma.Sql[] = [];

  for (const token of input.q.trim().toLocaleLowerCase("en-NG").split(/\s+/).filter(Boolean)) {
    const pattern = `%${token}%`;
    conditions.push(Prisma.sql`
      (
        LOWER(i.name) LIKE ${pattern}
        OR LOWER(COALESCE(i.description, '')) LIKE ${pattern}
        OR LOWER(COALESCE(i.brand, '')) LIKE ${pattern}
        OR LOWER(COALESCE(i.archive_number, '')) LIKE ${pattern}
        OR LOWER(COALESCE(i.sku, '')) LIKE ${pattern}
        OR LOWER(COALESCE(i.category_name, 'Uncategorised')) LIKE ${pattern}
        OR LOWER(COALESCE(i.collection_name, '')) LIKE ${pattern}
        OR EXISTS (
          SELECT 1
          FROM product_variants variant
          WHERE variant.product_id = i.id
            AND LOWER(CONCAT_WS(' ', variant.label, variant.sku, variant.size, variant.colour)) LIKE ${pattern}
        )
      )
    `);
  }

  if (input.mode !== "all") conditions.push(Prisma.sql`i.inventory_mode = ${input.mode}`);
  if (input.category === "Uncategorised") {
    conditions.push(Prisma.sql`i.category_name IS NULL`);
  } else if (input.category !== "all") {
    conditions.push(Prisma.sql`i.category_name = ${input.category}`);
  }
  if (input.collection !== "all") {
    conditions.push(Prisma.sql`i.collection_name = ${input.collection}`);
  }
  if (input.channel !== "all") {
    const channel = input.channel === "physical-store" ? "physical_store" : input.channel;
    conditions.push(Prisma.sql`
      EXISTS (
        SELECT 1
        FROM product_channels channel_entry
        WHERE channel_entry.product_id = i.id
          AND channel_entry.channel::text = ${channel}
      )
    `);
  }

  const viewCondition = savedViewCondition(input.view);
  if (viewCondition) conditions.push(viewCondition);
  const stockCondition = stockFilterCondition(input.stock);
  if (stockCondition) conditions.push(stockCondition);

  return conditions.length ? Prisma.join(conditions, " AND ") : Prisma.sql`TRUE`;
}

function savedViewCondition(view: InventoryProductListInput["view"]): Prisma.Sql | null {
  switch (view) {
    case "all":
      return null;
    case "live":
      return Prisma.sql`
        i.lifecycle = 'active'
        AND i.publication = 'published'
        AND i.available > 0
      `;
    case "drafts":
      return Prisma.sql`i.lifecycle = 'draft'`;
    case "intake":
      return Prisma.sql`i.lifecycle = 'intake'`;
    case "low-stock":
      return lowStockHealthPredicate;
    case "out-of-stock":
      return outOfStockHealthPredicate;
    case "held":
      return heldHealthPredicate;
    case "sold":
      return soldHealthPredicate;
    case "unpublished":
      return Prisma.sql`i.publication <> 'published'`;
    case "needs-attention":
      return needsAttentionPredicate;
  }
}

function stockFilterCondition(
  filter: InventoryProductListInput["stock"],
): Prisma.Sql | null {
  switch (filter) {
    case "all":
      return null;
    case "healthy":
      return healthyPredicate;
    case "low-stock":
      return lowStockHealthPredicate;
    case "out-of-stock":
      return outOfStockHealthPredicate;
    case "held":
      return heldHealthPredicate;
    case "sold":
      return soldHealthPredicate;
  }
}

function inventoryOrderBy(sort: InventoryProductListInput["sort"]): Prisma.Sql {
  switch (sort) {
    case "stock-asc":
      return Prisma.sql`i.available ASC, i.name ASC`;
    case "stock-desc":
      return Prisma.sql`i.available DESC, i.name ASC`;
    case "sold-desc":
      return Prisma.sql`i.sold DESC, i.name ASC`;
    case "price-asc":
      return Prisma.sql`i.price ASC, i.name ASC`;
    case "price-desc":
      return Prisma.sql`i.price DESC, i.name ASC`;
    case "name-asc":
      return Prisma.sql`i.name ASC`;
    case "updated-desc":
      return Prisma.sql`i.updated_at DESC, i.name ASC`;
  }
}

function toNumber(value: bigint | number | null | undefined): number {
  return value === null || value === undefined ? 0 : Number(value);
}
