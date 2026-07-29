import "server-only";

import { ApiError } from "@/lib/errors/api-error";
import { prisma } from "@/lib/prisma";
import type { ConsumerSession } from "@/modules/auth/server/session";
import { createReturn } from "@/modules/returns/server/commands";
import { adminReturnInclude, mapAdminReturnRow } from "@/modules/returns/server/mappers";
import { listEligibleReturnOrders } from "@/modules/returns/server/queries";
import type {
  AccountEligibleReturnOrder,
  AccountReturn,
  ControlRoomReturn,
  CreateAccountReturnInput,
  ReturnActionError,
} from "@/modules/returns/types";

function mapAccountReturn(record: ControlRoomReturn): AccountReturn {
  return {
    id: record.id,
    orderNumber: record.orderId,
    status: record.status,
    reason: record.reason,
    note: record.note,
    requestedAt: record.requestedAt,
    updatedAt: record.updatedAt,
    refundAmountKobo: Math.round(record.refundAmount * 100),
    currency: record.currency,
    lines: record.lines.map((line) => ({
      id: line.id,
      orderLineId: line.orderLineId,
      productName: line.productName,
      ...(line.variantLabel ? { variantLabel: line.variantLabel } : {}),
      quantity: line.quantity,
      disposition: line.disposition,
    })),
  };
}

export async function listAccountReturns(customerId: string): Promise<AccountReturn[]> {
  const rows = await prisma.returns.findMany({
    where: { order: { customer_id: customerId } },
    orderBy: { requested_at: "desc" },
    include: adminReturnInclude,
  });
  return rows.map((row) => mapAccountReturn(mapAdminReturnRow(row)));
}

export async function getAccountReturn(
  customerId: string,
  returnId: string,
): Promise<AccountReturn | null> {
  const row = await prisma.returns.findFirst({
    where: { id: returnId, order: { customer_id: customerId } },
    include: adminReturnInclude,
  });
  return row ? mapAccountReturn(mapAdminReturnRow(row)) : null;
}

export async function listEligibleAccountReturnOrders(
  customerId: string,
): Promise<AccountEligibleReturnOrder[]> {
  const orders = await listEligibleReturnOrders(customerId);
  return orders.map((order) => ({
    orderNumber: order.id,
    totalKobo: Math.round(order.total * 100),
    lines: order.lines.map(({ unitPrice, ...line }) => ({
      ...line,
      unitPriceKobo: Math.round(unitPrice * 100),
    })),
  }));
}

export async function createCustomerReturn(
  identity: ConsumerSession,
  input: CreateAccountReturnInput,
): Promise<AccountReturn> {
  const result = await createReturn(identity, {
    orderId: input.orderNumber,
    reason: input.reason,
    note: input.note ?? "",
    lines: input.lines,
  });
  if (!result.ok) throw accountReturnError(result.error);
  return mapAccountReturn(result.value.returnRecord);
}

function accountReturnError(error: ReturnActionError): ApiError {
  if (error.code === "order-not-found") {
    return new ApiError({
      code: "ORDER_NOT_FOUND",
      message: "The selected order could not be found.",
      status: 404,
    });
  }
  if (error.code === "return-line-not-found") {
    return new ApiError({
      code: "RETURN_LINE_NOT_FOUND",
      message: error.message,
      status: 404,
    });
  }
  if (error.code === "invalid-return-transition" || error.code === "return-line-not-sold") {
    return new ApiError({ code: "RETURN_NOT_ELIGIBLE", message: error.message, status: 409 });
  }
  if (error.code === "return-quantity-exceeded") {
    return new ApiError({
      code: "RETURN_QUANTITY_EXCEEDED",
      message: error.message,
      status: 409,
      fieldErrors: {
        ...(error.available === undefined ? {} : { available: String(error.available) }),
        ...(error.requested === undefined ? {} : { requested: String(error.requested) }),
      },
    });
  }
  return new ApiError({ code: "RETURN_REQUEST_INVALID", message: error.message, status: 422 });
}
