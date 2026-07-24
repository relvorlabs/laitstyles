import { apiRequest } from "@/lib/http/client";
import type { StockMovement } from "@/modules/inventory/types";

const STOCK_MOVEMENTS_URL = "/api/v1/admin/inventory/stock-movements";

export async function listStockMovements(
  productId?: string,
  signal?: AbortSignal,
): Promise<StockMovement[]> {
  const search = new URLSearchParams({ page: "1", pageSize: "500" });
  if (productId) search.set("productId", productId);
  const response = await apiRequest<StockMovement[]>(`${STOCK_MOVEMENTS_URL}?${search}`, {
    cache: "no-store",
    signal,
  });
  return response.data;
}
