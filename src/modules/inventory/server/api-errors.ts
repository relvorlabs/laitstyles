import { ApiError } from "@/lib/errors/api-error";
import type { StockAdjustmentError } from "@/modules/inventory/types";

export function throwStockAdjustmentError(error: StockAdjustmentError): never {
  switch (error.code) {
    case "forbidden":
      throw new ApiError({
        code: "INVENTORY_ADJUSTMENT_FORBIDDEN",
        message: error.message,
        status: 403,
      });
    case "product-not-found":
      throw new ApiError({
        code: "PRODUCT_NOT_FOUND",
        message: error.message,
        status: 404,
      });
    case "variant-not-found":
      throw new ApiError({
        code: "VARIANT_NOT_FOUND",
        message: error.message,
        status: 404,
      });
    case "stock-level-not-found":
      throw new ApiError({
        code: "STOCK_LEVEL_NOT_FOUND",
        message: error.message,
        status: 404,
      });
    case "invalid-adjustment":
      throw new ApiError({
        code: "INVENTORY_ADJUSTMENT_CONFLICT",
        message: error.message,
        status: 409,
      });
  }
}
