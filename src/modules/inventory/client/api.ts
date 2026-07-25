import { err, ok, type Result } from "@/lib/errors";
import type { ApiPaginationMeta } from "@/lib/http/contracts";
import { apiRequest, ApiClientError } from "@/lib/http/client";
import type {
  InventoryProductListInput,
  InventoryProductPage,
  InventorySummary,
  InventoryViewCounts,
  StockAdjustmentError,
  StockAdjustmentInput,
  StockAdjustmentOutcome,
  StockMovement,
} from "@/modules/inventory/types";
import type { AdminProduct } from "@/modules/products/types";

const INVENTORY_URL = "/api/v1/admin/inventory";
const STOCK_MOVEMENTS_URL = `${INVENTORY_URL}/stock-movements`;
const STOCK_ADJUSTMENTS_URL = `${INVENTORY_URL}/adjustments`;

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

export async function adjustInventoryStockRequest(
  input: StockAdjustmentInput,
): Promise<Result<StockAdjustmentOutcome, StockAdjustmentError>> {
  try {
    const response = await apiRequest<StockAdjustmentOutcome>(STOCK_ADJUSTMENTS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return ok(response.data);
  } catch (error) {
    if (error instanceof ApiClientError) return err(toStockAdjustmentError(error));
    throw error;
  }
}

function toStockAdjustmentError(error: ApiClientError): StockAdjustmentError {
  const code: StockAdjustmentError["code"] =
    error.code === "INVENTORY_ADJUSTMENT_FORBIDDEN" || error.code === "AUTH_FORBIDDEN"
      ? "forbidden"
      : error.code === "PRODUCT_NOT_FOUND"
        ? "product-not-found"
        : error.code === "VARIANT_NOT_FOUND"
          ? "variant-not-found"
          : error.code === "STOCK_LEVEL_NOT_FOUND"
            ? "stock-level-not-found"
            : "invalid-adjustment";
  return { code, message: error.message };
}
