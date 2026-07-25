import "server-only";

import { err, ok, type Result } from "@/lib/errors";
import type { Prisma } from "@/lib/prisma";
import { prisma } from "@/lib/prisma";
import {
  applyOperationalStockMutation,
  OperationalStockError,
  type OperationalStockMutationKind,
} from "@/modules/inventory/server/operational-stock";
import { canTransitionOrder, formatOrderStatus } from "@/modules/orders/rules";
import {
  adminOrderInclude,
  type AdminOrderRow,
  mapAdminOrderRow,
  mapDatabaseOrderStatus,
} from "@/modules/orders/server/mappers";
import { orderIdentifierWhere } from "@/modules/orders/server/queries";
import type {
  OrderStatus,
  OrderTransitionSuccess,
  SalesActionError,
} from "@/modules/orders/types";
import type { StaffSession } from "@/server/auth/session";

type DatabaseOrderLineStockState = AdminOrderRow["order_lines"][number]["stock_state"];

export async function transitionOrder(
  actor: StaffSession,
  identifier: string,
  nextStatus: OrderStatus,
): Promise<Result<OrderTransitionSuccess, SalesActionError>> {
  try {
    return await prisma.$transaction(async (tx) => {
      const order = await tx.orders.findFirst({
        where: orderIdentifierWhere(identifier),
        include: adminOrderInclude,
      });
      if (!order) {
        return err({
          code: "order-not-found",
          message: "The selected order could not be found.",
          orderId: identifier,
        });
      }

      const currentStatus = mapDatabaseOrderStatus(order);
      if (!canTransitionOrder(currentStatus, nextStatus)) {
        return err({
          code: "invalid-order-transition",
          message: `${formatOrderStatus(currentStatus)} cannot move directly to ${formatOrderStatus(nextStatus)}.`,
          orderId: order.order_number,
        });
      }

      if (order.source === "offline-sale" && nextStatus === "payment-confirmed") {
        return err({
          code: "invalid-payment-state",
          message:
            "In-person Paystack orders can only be marked paid by server verification or a signed webhook.",
          orderId: order.order_number,
        });
      }

      for (const line of order.order_lines) {
        const plan = orderLineStockPlan(line.stock_state, currentStatus, nextStatus);
        if (plan.mutation) {
          await applyOperationalStockMutation(tx, {
            productId: line.product_id,
            ...(line.variant_id ? { variantId: line.variant_id } : {}),
            quantity: line.quantity,
            kind: plan.mutation,
            actorProfileId: actor.authUserId,
            note: `${order.order_number} moved to ${formatOrderStatus(nextStatus)}.`,
            relatedOrderId: order.id,
            metadata: {
              previousStatus: currentStatus,
              nextStatus,
              orderLineId: line.id,
            },
          });
        }
        if (plan.nextStockState !== line.stock_state) {
          await tx.order_lines.update({
            where: { id: line.id },
            data: { stock_state: plan.nextStockState },
          });
        }
      }

      await tx.orders.update({
        where: { id: order.id },
        data: orderAggregateUpdate(order, nextStatus),
      });
      await tx.order_timeline_events.create({
        data: {
          order_id: order.id,
          status: nextStatus,
          actor_profile_id: actor.authUserId,
          note: `Order moved from ${formatOrderStatus(currentStatus)} to ${formatOrderStatus(nextStatus)}.`,
          metadata: { previousStatus: currentStatus, nextStatus },
        },
      });

      if (nextStatus === "payment-confirmed" || nextStatus === "refunded") {
        await tx.order_payment_events.create({
          data: {
            order_id: order.id,
            kind: nextStatus === "payment-confirmed" ? "succeeded" : "refund_recorded",
            status: nextStatus === "payment-confirmed" ? "success" : "reversed",
            amount:
              nextStatus === "payment-confirmed"
                ? order.total
                : order.total.minus(order.refunded_amount),
            currency: order.currency,
            method: order.payment_method,
            actor_profile_id: actor.authUserId,
            note:
              nextStatus === "payment-confirmed"
                ? "Payment confirmed by the store team."
                : "Refund state recorded by the store team; gateway execution is tracked separately.",
          },
        });
      }

      const unitCount = order.order_lines.reduce((total, line) => total + line.quantity, 0);
      await tx.activity_events.create({
        data: {
          kind: "order",
          title: `${order.order_number} moved to ${formatOrderStatus(nextStatus)}`,
          detail: `${unitCount} unit${unitCount === 1 ? "" : "s"} · ${order.delivery_city ?? "No delivery city"}`,
          actor_profile_id: actor.authUserId,
          order_id: order.id,
          customer_id: order.customer_id,
        },
      });

      const updated = await tx.orders.findUniqueOrThrow({
        where: { id: order.id },
        include: adminOrderInclude,
      });
      const mapped = mapAdminOrderRow(updated);
      return ok({
        order: mapped,
        message: `${mapped.id} moved to ${formatOrderStatus(nextStatus)}.`,
      });
    });
  } catch (error) {
    if (error instanceof OperationalStockError) return err(mapStockError(error, identifier));
    throw error;
  }
}

function orderLineStockPlan(
  current: DatabaseOrderLineStockState,
  currentStatus: OrderStatus,
  nextStatus: OrderStatus,
): {
  mutation: OperationalStockMutationKind | null;
  nextStockState: DatabaseOrderLineStockState;
} {
  if (nextStatus === "payment-confirmed") {
    if (current === "reserved") return { mutation: "commit-reserved", nextStockState: "committed" };
    if (current === "uncommitted") {
      return { mutation: "commit-available", nextStockState: "committed" };
    }
  }
  if (nextStatus === "delivered" && current === "committed") {
    return { mutation: "sell-committed", nextStockState: "committed" };
  }
  if (nextStatus === "cancelled") {
    if (current === "reserved") return { mutation: "release-reserved", nextStockState: "released" };
    if (current === "committed") {
      return { mutation: "release-committed", nextStockState: "released" };
    }
    return { mutation: null, nextStockState: "released" };
  }
  if (nextStatus === "refunded") {
    if (current === "reserved") return { mutation: "release-reserved", nextStockState: "released" };
    if (current === "committed" && currentStatus !== "delivered") {
      return { mutation: "release-committed", nextStockState: "released" };
    }
  }
  if (nextStatus === "returned") {
    if (current === "committed" && currentStatus === "delivered") {
      return { mutation: "return-sold", nextStockState: "returned" };
    }
    if (current === "reserved") return { mutation: "release-reserved", nextStockState: "released" };
  }
  return { mutation: null, nextStockState: current };
}

function orderAggregateUpdate(
  order: Pick<AdminOrderRow, "refunded_amount" | "total">,
  nextStatus: OrderStatus,
): Prisma.ordersUpdateInput {
  switch (nextStatus) {
    case "pending-payment":
      return { payment_status: "pending", fulfilment_status: "unfulfilled", attention: "payment" };
    case "payment-confirmed":
      return {
        payment_status: "paid",
        fulfilment_status: "unfulfilled",
        attention: null,
        paid_at: new Date(),
      };
    case "preparing":
      return { fulfilment_status: "processing", attention: "packing" };
    case "packed":
      return { fulfilment_status: "ready_for_dispatch", attention: null };
    case "ready-for-pickup":
      return {
        fulfilment_method: "pickup",
        fulfilment_status: "ready_for_dispatch",
        attention: null,
      };
    case "dispatched":
    case "out-for-delivery":
      return { fulfilment_status: "dispatched" };
    case "delivered":
      return { fulfilment_status: "delivered", attention: null };
    case "cancelled":
      return {
        payment_status: "cancelled",
        fulfilment_status: "cancelled",
        attention: null,
      };
    case "refunded":
      return { payment_status: "refunded", refunded_amount: order.total, attention: null };
    case "returned":
      return { fulfilment_status: "returned", attention: "return" };
  }
}

function mapStockError(error: OperationalStockError, orderId?: string): SalesActionError {
  return {
    code:
      error.code === "stock-level-not-found"
        ? "product-not-found"
        : (error.code as SalesActionError["code"]),
    message: error.message,
    productId: error.context.productId,
    ...(error.context.variantId ? { variantId: error.context.variantId } : {}),
    ...(error.context.requested === undefined ? {} : { requested: error.context.requested }),
    ...(error.context.available === undefined ? {} : { available: error.context.available }),
    ...(orderId ? { orderId } : {}),
  };
}
