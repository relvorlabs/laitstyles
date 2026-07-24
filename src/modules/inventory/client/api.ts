import type { ApiPaginationMeta } from "@/lib/http/contracts";
import { apiRequest } from "@/lib/http/client";
import type {
  InventoryProductListInput,
  InventoryProductPage,
  InventorySummary,
  InventoryViewCounts,
  StockMovement,
} from "@/modules/inventory/types";
import type { AdminProduct } from "@/modules/products/types";

const INVENTORY_URL = "/api/v1/admin/inventory";
const STOCK_MOVEMENTS_URL = `${INVENTORY_URL}/stock-movements`;

type InventoryPageMeta = ApiPaginationMeta & {
  summary: InventorySummary;
  viewCounts: InventoryViewCounts;
};

export async function listInventoryProductPage(
  input: InventoryProductListInput,
  signal?: AbortSignal,
): Promise<InventoryProductPage> {
  const search = new URLSearchParams({
    view: input.view,
    q: input.q,
    mode: input.mode,
    stock: input.stock,
    category: input.category,
    collection: input.collection,
    channel: input.channel,
    sort: input.sort,
    page: String(input.page),
    pageSize: String(input.pageSize),
  });
  const response = await apiRequest<AdminProduct[], InventoryPageMeta>(
    `${INVENTORY_URL}?${search}`,
    { cache: "no-store", signal },
  );
  if (!response.meta) {
    throw new Error("Inventory response is missing pagination metadata.");
  }

  return {
    products: response.data,
    pagination: {
      page: response.meta.page,
      pageSize: response.meta.pageSize,
      total: response.meta.total,
      pageCount: response.meta.pageCount,
    },
    summary: response.meta.summary,
    viewCounts: response.meta.viewCounts,
  };
}

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
