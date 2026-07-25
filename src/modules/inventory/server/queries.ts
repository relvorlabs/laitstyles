import "server-only";

import type { ApiPaginationMeta } from "@/lib/http/contracts";
import { prisma } from "@/lib/prisma";
import { mapStockMovementRow } from "@/modules/inventory/server/mappers";
import type { StockMovement } from "@/modules/inventory/types";

export type StockMovementListInput = {
  productId?: string;
  page: number;
  pageSize: number;
};

export type StockMovementListResult = {
  data: StockMovement[];
  meta: ApiPaginationMeta;
};

export async function listStockMovements({
  productId,
  page,
  pageSize,
}: StockMovementListInput): Promise<StockMovementListResult> {
  const where = productId ? { product_id: productId } : {};
  const [rows, total] = await prisma.$transaction([
    prisma.stock_movements.findMany({
      where,
      include: { profiles: { select: { display_name: true } } },
      orderBy: { occurred_at: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.stock_movements.count({ where }),
  ]);

  return {
    data: rows.map(mapStockMovementRow),
    meta: {
      page,
      pageSize,
      total,
      pageCount: Math.ceil(total / pageSize),
    },
  };
}
