import "server-only";

import type { InventoryCounts, StockMovement } from "@/modules/inventory/types";

const EMPTY_COUNTS: InventoryCounts = {
  totalReceived: 0,
  available: 0,
  reserved: 0,
  sold: 0,
  returned: 0,
  damaged: 0,
};

/**
 * The admin DTO has no separate committed balance. Surface reserved and
 * committed together so the editor never treats committed units as editable.
 */
export function mapInventoryCounts(
  row:
    | {
        total_received: number;
        available: number;
        reserved: number;
        committed: number;
        sold: number;
        returned: number;
        damaged: number;
      }
    | undefined,
): InventoryCounts {
  if (!row) return { ...EMPTY_COUNTS };
  return {
    totalReceived: row.total_received,
    available: row.available,
    reserved: row.reserved + row.committed,
    sold: row.sold,
    returned: row.returned,
    damaged: row.damaged,
  };
}

function mapStockMovementKind(kind: string): StockMovement["kind"] {
  if (kind === "reservation_released" || kind === "commitment_released") return "released";
  if (kind === "committed") return "reserved";
  return kind as StockMovement["kind"];
}

export function mapStockMovementRow(row: {
  id: string;
  product_id: string;
  variant_id: string | null;
  kind: string;
  quantity: number;
  occurred_at: Date;
  note: string | null;
  profiles: { display_name: string | null } | null;
}): StockMovement {
  return {
    id: row.id,
    productId: row.product_id,
    variantId: row.variant_id,
    kind: mapStockMovementKind(row.kind),
    quantity: row.quantity,
    occurredAt: row.occurred_at.toISOString(),
    actor: row.profiles?.display_name ?? "Store owner",
    note: row.note ?? "",
  };
}
