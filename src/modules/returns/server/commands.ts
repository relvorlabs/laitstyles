import "server-only";

import { err, ok, type Result } from "@/lib/errors";
import type { Prisma } from "@/lib/prisma";
import { prisma } from "@/lib/prisma";
import {
  applyOperationalStockMutation,
  OperationalStockError,
  type OperationalStockMutationKind,
} from "@/modules/inventory/server/operational-stock";
import { orderIdentifierWhere } from "@/modules/orders/server/queries";
import {
  type AdminReturnRow,
  adminReturnInclude,
  mapAdminReturnRow,
  mapDatabaseReturnStatus,
} from "@/modules/returns/server/mappers";
import type {
  CreateReturnInput,
  ReturnActionError,
  ReturnActionSuccess,
  ReturnStatus,
} from "@/modules/returns/types";
import type { StaffSession } from "@/server/auth/session";

const transitionMap = {
  requested: ["approved", "rejected"],
  approved: ["received", "rejected"],
  received: ["inspecting"],
  inspecting: ["refunded", "restocked", "damaged"],
  refunded: ["restocked", "damaged", "closed"],
  restocked: ["closed"],
  damaged: ["closed"],
  rejected: ["closed"],
  closed: [],
} as const satisfies Record<ReturnStatus, readonly ReturnStatus[]>;

export async function createReturn(
  actor: StaffSession,
  input: CreateReturnInput,
): Promise<Result<ReturnActionSuccess, ReturnActionError>> {
  try {
    return await prisma.$transaction(async (tx) => {
      const uniqueLineIds = [...new Set(input.lines.map((line) => line.orderLineId))].toSorted();
      if (uniqueLineIds.length !== input.lines.length) {
        return err({
          code: "return-line-not-found",
          message: "Each order line may appear only once in a return request.",
          orderId: input.orderId,
          field: "lines",
        });
      }
      for (const lineId of uniqueLineIds) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lineId}, 0))`;
      }

      const order = await tx.orders.findFirst({
        where: orderIdentifierWhere(input.orderId),
        include: {
          customer: true,
          order_lines: {
            include: {
              return_lines: { include: { return: { select: { status: true } } } },
            },
          },
        },
      });
      if (!order) {
        return err({
          code: "order-not-found",
          message: "The order for this return could not be found.",
          orderId: input.orderId,
        });
      }
      if (
        !(["delivered", "partially_returned"] as const).includes(order.fulfilment_status as never)
      ) {
        return err({
          code: "invalid-return-transition",
          message:
            "Only a delivered order can enter the customer return workflow. Cancel or refund an undelivered order instead.",
          orderId: order.order_number,
        });
      }

      const selected = new Map(input.lines.map((line) => [line.orderLineId, line]));
      let refundAmount = 0;
      const createLines: Array<{ order_line_id: string; quantity: number }> = [];
      for (const [index, requestedLine] of input.lines.entries()) {
        const orderLine = order.order_lines.find((line) => line.id === requestedLine.orderLineId);
        if (!orderLine || !selected.has(orderLine.id)) {
          return err({
            code: "return-line-not-found",
            message: "A selected order line could not be found on this order.",
            orderId: order.order_number,
            field: `lines.${index}.orderLineId`,
          });
        }
        if (!Number.isInteger(requestedLine.quantity) || requestedLine.quantity < 1) {
          return err({
            code: "invalid-quantity",
            message: "Return quantity must be a whole number greater than zero.",
            orderId: order.order_number,
            productId: orderLine.product_id,
            ...(orderLine.variant_id ? { variantId: orderLine.variant_id } : {}),
            field: `lines.${index}.quantity`,
            requested: requestedLine.quantity,
          });
        }
        const alreadyReturned = orderLine.return_lines
          .filter(
            (entry) => entry.return.status !== "rejected" && entry.return.status !== "cancelled",
          )
          .reduce((total, entry) => total + entry.quantity, 0);
        const eligible = Math.max(0, orderLine.quantity - alreadyReturned);
        if (requestedLine.quantity > eligible) {
          return err({
            code: "return-quantity-exceeded",
            message: `Only ${eligible} unit${eligible === 1 ? " is" : "s are"} still eligible for return on this order line.`,
            orderId: order.order_number,
            productId: orderLine.product_id,
            ...(orderLine.variant_id ? { variantId: orderLine.variant_id } : {}),
            field: `lines.${index}.quantity`,
            available: eligible,
            requested: requestedLine.quantity,
          });
        }
        createLines.push({ order_line_id: orderLine.id, quantity: requestedLine.quantity });
        refundAmount += requestedLine.quantity * orderLine.unit_price.toNumber();
      }

      const created = await tx.returns.create({
        data: {
          order_id: order.id,
          status: "requested",
          reason: input.reason.trim(),
          refund_amount: refundAmount.toFixed(2),
          note: input.note.trim() || null,
          return_lines: { create: createLines },
        },
        include: adminReturnInclude,
      });
      await tx.orders.update({
        where: { id: order.id },
        data: { attention: "return" },
      });
      await tx.activity_events.create({
        data: {
          kind: "return",
          title: `Return requested for ${order.order_number}`,
          detail: `${createLines.reduce((total, line) => total + line.quantity, 0)} unit${createLines.reduce((total, line) => total + line.quantity, 0) === 1 ? "" : "s"} · ${input.reason.trim()}`,
          actor_profile_id: actor.authUserId,
          order_id: order.id,
          customer_id: order.customer_id,
        },
      });
      await recordReturnAudit(tx, actor, created.id, "return.created", {
        orderId: order.id,
        orderNumber: order.order_number,
        refundAmount,
      });

      const returnRecord = mapAdminReturnRow(created);
      return ok({
        returnRecord,
        message: `Return ${returnRecord.id} was opened for ${returnRecord.orderId}.`,
      });
    });
  } catch (error) {
    if (error instanceof OperationalStockError) return err(mapStockError(error));
    throw error;
  }
}

export async function transitionReturn(
  actor: StaffSession,
  returnId: string,
  nextStatus: ReturnStatus,
): Promise<Result<ReturnActionSuccess, ReturnActionError>> {
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${returnId}, 0))`;
      const current = await tx.returns.findUnique({
        where: { id: returnId },
        include: adminReturnInclude,
      });
      if (!current) {
        return err({
          code: "return-not-found",
          message: "The selected return could not be found.",
          returnId,
        });
      }
      const currentStatus = mapDatabaseReturnStatus(current);
      if (!transitionMap[currentStatus].includes(nextStatus as never)) {
        return err({
          code: "invalid-return-transition",
          message: `${formatReturnStatus(currentStatus)} cannot move directly to ${formatReturnStatus(nextStatus)}.`,
          returnId,
          orderId: current.order.order_number,
        });
      }

      const stockMutation = stockMutationFor(nextStatus);
      if (stockMutation) {
        for (const line of current.return_lines) {
          await applyOperationalStockMutation(tx, {
            productId: line.order_line.product_id,
            ...(line.order_line.variant_id ? { variantId: line.order_line.variant_id } : {}),
            quantity: line.quantity,
            kind: stockMutation,
            actorProfileId: actor.authUserId,
            note: `Return ${returnId} moved to ${formatReturnStatus(nextStatus)}.`,
            relatedOrderId: current.order_id,
            relatedReturnId: returnId,
            metadata: {
              operation: "return-transition",
              nextStatus,
              orderLineId: line.order_line_id,
            },
          });
        }
      }

      await applyReturnPersistence(tx, actor, current, nextStatus);
      await tx.activity_events.create({
        data: {
          kind: "return",
          title: `Return ${returnId} moved to ${formatReturnStatus(nextStatus)}`,
          detail: `${current.return_lines.reduce((total, line) => total + line.quantity, 0)} unit${current.return_lines.reduce((total, line) => total + line.quantity, 0) === 1 ? "" : "s"} · ${current.order.order_number}`,
          actor_profile_id: actor.authUserId,
          order_id: current.order_id,
          customer_id: current.order.customer_id,
        },
      });
      await recordReturnAudit(tx, actor, returnId, "return.transitioned", {
        previousStatus: currentStatus,
        nextStatus,
      });

      const updated = await tx.returns.findUniqueOrThrow({
        where: { id: returnId },
        include: adminReturnInclude,
      });
      const returnRecord = mapAdminReturnRow(updated);
      return ok({
        returnRecord,
        message: `Return ${returnId} moved to ${formatReturnStatus(nextStatus)}.`,
      });
    });
  } catch (error) {
    if (error instanceof OperationalStockError) return err(mapStockError(error, returnId));
    throw error;
  }
}

async function applyReturnPersistence(
  tx: Prisma.TransactionClient,
  actor: StaffSession,
  current: AdminReturnRow,
  nextStatus: ReturnStatus,
) {
  const now = new Date();
  if (nextStatus === "received") {
    await tx.returns.update({
      where: { id: current.id },
      data: { status: "received", received_at: now, completed_at: null },
    });
    await updateOrderPhysicalReturnState(tx, current.order_id, actor, current.id);
    return;
  }
  if (nextStatus === "refunded") {
    const nextRefund = current.order.refunded_amount.plus(current.refund_amount);
    const cappedRefund = nextRefund.greaterThan(current.order.total)
      ? current.order.total
      : nextRefund;
    const fullyRefunded = cappedRefund.greaterThanOrEqualTo(current.order.total);
    await tx.returns.update({
      where: { id: current.id },
      data: { status: "completed", completed_at: null },
    });
    await tx.orders.update({
      where: { id: current.order_id },
      data: {
        refunded_amount: cappedRefund,
        payment_status: fullyRefunded ? "refunded" : "partially_refunded",
        attention: "return",
      },
    });
    for (const line of current.return_lines) {
      const orderLine = line.order_line;
      const nextLineRefund = orderLine.refunded_amount.plus(
        orderLine.unit_price.mul(line.quantity),
      );
      const lineTotal = orderLine.unit_price.mul(orderLine.quantity);
      await tx.order_lines.update({
        where: { id: orderLine.id },
        data: {
          refunded_amount: nextLineRefund.greaterThan(lineTotal) ? lineTotal : nextLineRefund,
          refund_status: nextLineRefund.greaterThanOrEqualTo(lineTotal)
            ? "refunded"
            : "partially_refunded",
          refunded_at: now,
        },
      });
    }
    await tx.order_payment_events.create({
      data: {
        order_id: current.order_id,
        kind: "refund_recorded",
        status: "reversed",
        amount: current.refund_amount,
        currency: current.order.currency,
        method: current.order.payment_method,
        actor_profile_id: actor.authUserId,
        note: `Refund recorded for return ${current.id}; no payment provider was called.`,
        metadata: { returnId: current.id },
      },
    });
    return;
  }
  if (nextStatus === "restocked" || nextStatus === "damaged") {
    await tx.return_lines.updateMany({
      where: { return_id: current.id },
      data: { disposition: nextStatus === "restocked" ? "restock" : "damaged" },
    });
    await tx.returns.update({
      where: { id: current.id },
      data: { status: "completed", completed_at: null },
    });
    return;
  }
  if (nextStatus === "closed") {
    await tx.returns.update({
      where: { id: current.id },
      data: { status: "completed", completed_at: now },
    });
    const remaining = await tx.returns.count({
      where: {
        order_id: current.order_id,
        id: { not: current.id },
        status: { in: ["requested", "approved", "received", "inspecting"] },
      },
    });
    if (!remaining) {
      await tx.orders.update({ where: { id: current.order_id }, data: { attention: null } });
    }
    return;
  }
  await tx.returns.update({
    where: { id: current.id },
    data: {
      status: nextStatus,
      ...(nextStatus === "rejected" ? { completed_at: null } : {}),
    },
  });
}

async function updateOrderPhysicalReturnState(
  tx: Prisma.TransactionClient,
  orderId: string,
  actor: StaffSession,
  returnId: string,
) {
  const order = await tx.orders.findUniqueOrThrow({
    where: { id: orderId },
    include: {
      order_lines: {
        include: {
          return_lines: { include: { return: { select: { status: true } } } },
        },
      },
    },
  });
  let allReturned = true;
  for (const line of order.order_lines) {
    const returnedQuantity = line.return_lines
      .filter((entry) => ["received", "inspecting", "completed"].includes(entry.return.status))
      .reduce((total, entry) => total + entry.quantity, 0);
    const fullyReturned = returnedQuantity >= line.quantity;
    allReturned &&= fullyReturned;
    await tx.order_lines.update({
      where: { id: line.id },
      data: {
        stock_state: fullyReturned ? "returned" : line.stock_state,
        fulfilment_status: fullyReturned
          ? "returned"
          : returnedQuantity > 0
            ? "partially_returned"
            : line.fulfilment_status,
      },
    });
  }
  await tx.orders.update({
    where: { id: orderId },
    data: {
      fulfilment_status: allReturned ? "returned" : "partially_returned",
      attention: "return",
    },
  });
  await tx.order_timeline_events.create({
    data: {
      order_id: orderId,
      status: allReturned ? "returned" : "partially-returned",
      actor_profile_id: actor.authUserId,
      note: `Physical stock received for return ${returnId}.`,
      metadata: { returnId },
    },
  });
}

function stockMutationFor(status: ReturnStatus): OperationalStockMutationKind | null {
  if (status === "received") return "return-sold";
  if (status === "restocked") return "restock-returned";
  if (status === "damaged") return "damage-returned";
  return null;
}

async function recordReturnAudit(
  tx: Prisma.TransactionClient,
  actor: StaffSession,
  returnId: string,
  action: string,
  metadata: Prisma.InputJsonValue,
) {
  await tx.audit_events.create({
    data: {
      actor_profile_id: actor.authUserId,
      action,
      target_table: "returns",
      target_id: returnId,
      metadata,
    },
  });
}

function mapStockError(error: OperationalStockError, returnId?: string): ReturnActionError {
  const supported = new Set<ReturnActionError["code"]>([
    "insufficient-sold-stock",
    "insufficient-returned-stock",
    "stock-write-conflict",
  ]);
  const code = supported.has(error.code as ReturnActionError["code"])
    ? (error.code as ReturnActionError["code"])
    : "stock-write-conflict";
  return {
    code,
    message: error.message,
    ...(returnId ? { returnId } : {}),
    productId: error.context.productId,
    ...(error.context.variantId ? { variantId: error.context.variantId } : {}),
    ...(error.context.available === undefined ? {} : { available: error.context.available }),
    ...(error.context.requested === undefined ? {} : { requested: error.context.requested }),
  };
}

function formatReturnStatus(status: ReturnStatus) {
  return status.replaceAll("-", " ");
}
