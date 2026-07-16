import {
  canTransitionReturn,
  getReturnedQuantityForOrderLine,
  inferOrderLineStockState,
} from "@/lib/admin/orders/sales-selectors";
import {
  applySalesStockMutation,
  type SalesStockMutationKind,
} from "@/lib/admin/orders/sales-stock";
import { err, ok, type Result } from "@/lib/admin/result";
import type {
  ControlRoomOrder,
  ControlRoomReturn,
  ControlRoomState,
  CreateReturnInput,
  ReturnActionSuccess,
  ReturnStatus,
  SalesActionError,
  StockMovement,
} from "@/lib/admin/types";

const physicallyReturnedStatuses = new Set<ReturnStatus>([
  "received",
  "inspecting",
  "refunded",
  "restocked",
  "damaged",
  "closed",
]);

export type ReturnActionStateResult = {
  state: ControlRoomState;
  action: ReturnActionSuccess;
};

export function applyCreateReturn(
  state: ControlRoomState,
  input: CreateReturnInput,
  now: string,
  idFactory: (prefix: string) => string = createActionId,
): Result<ReturnActionStateResult, SalesActionError> {
  const order = state.orders.find((item) => item.id === input.orderId);
  if (!order) {
    return err({
      code: "order-not-found",
      message: "The order for this return could not be found.",
      orderId: input.orderId,
    });
  }

  if (order.fulfilmentStatus !== "delivered") {
    return err({
      code: "invalid-return-transition",
      message:
        "Only a delivered order can enter the customer return workflow. Cancel or refund an undelivered order instead.",
      orderId: order.id,
    });
  }

  if (!input.lines.length) {
    return err({
      code: "return-line-not-found",
      message: "Choose at least one sold order line to return.",
      orderId: order.id,
      field: "lines",
    });
  }

  const existingReturns = state.returns ?? [];
  const returnLines: ControlRoomReturn["lines"] = [];
  let refundAmount = 0;

  for (const [index, requestedLine] of input.lines.entries()) {
    const orderLine = order.lines.find((line) => line.id === requestedLine.orderLineId);
    if (!orderLine) {
      return err({
        code: "return-line-not-found",
        message: "A selected order line could not be found.",
        orderId: order.id,
        field: `lines.${index}.orderLineId`,
      });
    }
    if (!Number.isInteger(requestedLine.quantity) || requestedLine.quantity < 1) {
      return err({
        code: "invalid-quantity",
        message: "Return quantity must be a whole number greater than zero.",
        orderId: order.id,
        productId: orderLine.productId,
        variantId: orderLine.variantId,
        field: `lines.${index}.quantity`,
        requested: requestedLine.quantity,
      });
    }

    if (inferOrderLineStockState(order, orderLine) !== "sold") {
      return err({
        code: "return-line-not-sold",
        message: "Only a sold order line can enter the return workflow.",
        orderId: order.id,
        productId: orderLine.productId,
        variantId: orderLine.variantId,
        field: `lines.${index}.orderLineId`,
      });
    }

    const alreadyReturned = getReturnedQuantityForOrderLine(
      existingReturns,
      order.id,
      orderLine.id,
    );
    const eligible = orderLine.quantity - alreadyReturned;
    if (requestedLine.quantity > eligible) {
      return err({
        code: "return-quantity-exceeded",
        message: `Only ${eligible} unit${eligible === 1 ? " is" : "s are"} still eligible for return on this order line.`,
        orderId: order.id,
        productId: orderLine.productId,
        variantId: orderLine.variantId,
        field: `lines.${index}.quantity`,
        available: eligible,
        requested: requestedLine.quantity,
      });
    }

    returnLines.push({
      id: idFactory("return-line"),
      orderLineId: orderLine.id,
      productId: orderLine.productId,
      variantId: orderLine.variantId,
      quantity: requestedLine.quantity,
      disposition: "pending",
    });
    refundAmount += requestedLine.quantity * orderLine.unitPrice;
  }

  const returnRecord: ControlRoomReturn = {
    id: idFactory("return"),
    orderId: order.id,
    customerId: order.customerId,
    status: "requested",
    reason: input.reason.trim() || "Customer requested a return",
    requestedAt: now,
    updatedAt: now,
    lines: returnLines,
    refundAmount,
    note: input.note.trim(),
  };
  const message = `Return ${returnRecord.id} was opened for ${order.id}.`;

  return ok({
    state: {
      ...state,
      asOf: now,
      returns: [returnRecord, ...existingReturns],
      orders: state.orders.map((item) =>
        item.id === order.id ? { ...item, attention: "return" } : item,
      ),
      activities: [
        {
          id: idFactory("activity"),
          kind: "return",
          title: `Return requested for ${order.id}`,
          detail: `${returnLines.reduce((sum, line) => sum + line.quantity, 0)} unit${returnLines.reduce((sum, line) => sum + line.quantity, 0) === 1 ? "" : "s"} · ${returnRecord.reason}`,
          occurredAt: now,
          orderId: order.id,
          customerId: order.customerId ?? undefined,
        },
        ...state.activities,
      ],
    },
    action: { returnRecord, message },
  });
}

export function applyReturnTransition(
  state: ControlRoomState,
  returnId: string,
  nextStatus: ReturnStatus,
  now: string,
  idFactory: (prefix: string) => string = createActionId,
): Result<ReturnActionStateResult, SalesActionError> {
  const returnRecord = (state.returns ?? []).find((item) => item.id === returnId);
  if (!returnRecord) {
    return err({
      code: "return-not-found",
      message: "The selected return could not be found.",
      returnId,
    });
  }
  if (!canTransitionReturn(returnRecord.status, nextStatus)) {
    return err({
      code: "invalid-return-transition",
      message: `${formatReturnStatus(returnRecord.status)} cannot move directly to ${formatReturnStatus(nextStatus)}.`,
      returnId,
      orderId: returnRecord.orderId,
    });
  }

  const order = state.orders.find((item) => item.id === returnRecord.orderId);
  if (!order) {
    return err({
      code: "order-not-found",
      message: "The order attached to this return could not be found.",
      orderId: returnRecord.orderId,
      returnId,
    });
  }

  const mutation = getReturnStockMutation(nextStatus);
  let products = state.products;
  const movements: StockMovement[] = [];

  if (mutation) {
    for (const line of returnRecord.lines) {
      const stockResult = applySalesStockMutation(products, {
        productId: line.productId,
        variantId: line.variantId,
        quantity: line.quantity,
        kind: mutation,
      });
      if (!stockResult.ok) return stockResult;
      products = stockResult.value.products;
      movements.push({
        id: idFactory("movement"),
        productId: line.productId,
        variantId: line.variantId ?? null,
        kind:
          mutation === "return-sold"
            ? "returned"
            : mutation === "restock-returned"
              ? "restocked"
              : "damaged",
        quantity: line.quantity,
        occurredAt: now,
        actor: "Store owner",
        note: `Return ${returnRecord.id} moved to ${formatReturnStatus(nextStatus)}.`,
      });
    }
  }

  const updatedReturn: ControlRoomReturn = {
    ...returnRecord,
    status: nextStatus,
    updatedAt: now,
    lines: returnRecord.lines.map((line) => ({
      ...line,
      disposition:
        nextStatus === "restocked"
          ? "restock"
          : nextStatus === "damaged"
            ? "damaged"
            : line.disposition,
    })),
  };
  const nextReturns = (state.returns ?? []).map((item) =>
    item.id === returnRecord.id ? updatedReturn : item,
  );
  const updatedOrder = updateOrderForReturn(
    order,
    nextReturns,
    updatedReturn,
    nextStatus,
    now,
    idFactory,
  );
  const message = `Return ${returnRecord.id} moved to ${formatReturnStatus(nextStatus)}.`;

  return ok({
    state: {
      ...state,
      asOf: now,
      products,
      returns: nextReturns,
      orders: state.orders.map((item) => (item.id === order.id ? updatedOrder : item)),
      stockMovements: [...movements, ...state.stockMovements],
      activities: [
        {
          id: idFactory("activity"),
          kind: "return",
          title: message,
          detail: `${returnRecord.lines.reduce((sum, line) => sum + line.quantity, 0)} unit${returnRecord.lines.reduce((sum, line) => sum + line.quantity, 0) === 1 ? "" : "s"} · ${order.id}`,
          occurredAt: now,
          orderId: order.id,
          customerId: order.customerId ?? undefined,
        },
        ...state.activities,
      ],
    },
    action: { returnRecord: updatedReturn, message },
  });
}

function getReturnStockMutation(status: ReturnStatus): SalesStockMutationKind | null {
  if (status === "received") return "return-sold";
  if (status === "restocked") return "restock-returned";
  if (status === "damaged") return "damage-returned";
  return null;
}

function updateOrderForReturn(
  order: ControlRoomOrder,
  returns: ControlRoomReturn[],
  currentReturn: ControlRoomReturn,
  status: ReturnStatus,
  now: string,
  idFactory: (prefix: string) => string,
): ControlRoomOrder {
  const physicallyReturnedByLine = new Map<string, number>();

  for (const returnRecord of returns) {
    if (returnRecord.orderId !== order.id || !physicallyReturnedStatuses.has(returnRecord.status)) {
      continue;
    }
    for (const line of returnRecord.lines) {
      physicallyReturnedByLine.set(
        line.orderLineId,
        (physicallyReturnedByLine.get(line.orderLineId) ?? 0) + line.quantity,
      );
    }
  }

  const isFullReturn = order.lines.every(
    (orderLine) => (physicallyReturnedByLine.get(orderLine.id) ?? 0) >= orderLine.quantity,
  );
  const refundedAmount = Math.min(
    order.total,
    (order.refundedAmount ?? 0) + (status === "refunded" ? currentReturn.refundAmount : 0),
  );
  const fullyRefunded = refundedAmount >= order.total;

  return {
    ...order,
    refundedAmount,
    paymentStatus: fullyRefunded ? "refunded" : order.paymentStatus,
    fulfilmentStatus: isFullReturn ? "returned" : order.fulfilmentStatus,
    attention: status === "closed" || status === "rejected" ? undefined : "return",
    payments:
      status === "refunded"
        ? [
            ...(order.payments ?? []),
            {
              id: idFactory("payment-event"),
              status: "refunded",
              method: order.paymentMethod ?? null,
              amount: currentReturn.refundAmount,
              occurredAt: now,
              note: `Prototype refund state recorded for return ${currentReturn.id}; no payment provider was called.`,
            },
          ]
        : order.payments,
    timeline: [
      ...(order.timeline ?? []),
      {
        id: idFactory("order-event"),
        status: isFullReturn ? "returned" : fullyRefunded ? "refunded" : order.fulfilmentStatus,
        occurredAt: now,
        actor: "Store owner",
        note: `Return ${currentReturn.id} moved to ${formatReturnStatus(status)}.`,
      },
    ],
  };
}

export function formatReturnStatus(status: ReturnStatus) {
  return status.replaceAll("-", " ");
}

function createActionId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}
