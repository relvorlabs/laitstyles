import type { Result } from "@/lib/errors";
import { recordOfflineSale as recordOfflineSaleCommand } from "@/modules/orders/server/offline-sale";
import { transitionOrder as transitionOrderCommand } from "@/modules/orders/server/transition-order";
import type {
  OfflineSaleInput,
  OfflineSaleSuccess,
  OrderStatus,
  OrderTransitionSuccess,
  SalesActionError,
} from "@/modules/orders/types";
import type { StaffSession } from "@/server/auth/session";

export async function recordOfflineSale(
  actor: StaffSession,
  input: OfflineSaleInput,
): Promise<Result<OfflineSaleSuccess, SalesActionError>> {
  return normalizeStockConflict(await recordOfflineSaleCommand(actor, input));
}

export async function transitionOrder(
  actor: StaffSession,
  identifier: string,
  nextStatus: OrderStatus,
): Promise<Result<OrderTransitionSuccess, SalesActionError>> {
  return normalizeStockConflict(await transitionOrderCommand(actor, identifier, nextStatus));
}

function normalizeStockConflict<T>(
  result: Result<T, SalesActionError>,
): Result<T, SalesActionError> {
  if (
    !result.ok &&
    result.error.code === "insufficient-available-stock" &&
    result.error.available === undefined
  ) {
    return {
      ok: false,
      error: {
        ...result.error,
        code: "stock-write-conflict",
      },
    };
  }
  return result;
}
