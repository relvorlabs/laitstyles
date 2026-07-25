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
  mapAdminOrderRow,
  mapDatabaseOrderStatus,
} from "@/modules/orders/server/mappers";
import { orderIdentifierWhere } from "@/modules/orders/server/queries";
import type {
  ControlRoomOrder,
  OfflineSaleInput,
  OfflineSaleSuccess,
  OrderLineStockState,
  OrderStatus,
  OrderTransitionSuccess,
  SalesActionError,
} from "@/modules/orders/types";
import type { StaffSession } from "@/server/auth/session";

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

      const update = orderAggregateUpdate(order, nextStatus);
      await tx.orders.update({ where: { id: order.id }, data: update });
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
                : "Refund recorded by the store team.",
          },
        });
      }

      await tx.activity_events.create({
        data: {
          kind: "order",
          title: `${order.order_number} moved to ${formatOrderStatus(nextStatus)}`,
          detail: `${order.order_lines.reduce((total, line) => total + line.quantity, 0)} unit${order.order_lines.reduce((total, line) => total + line.quantity, 0) === 1 ? "" : "s"} · ${order.delivery_city ?? "No delivery city"}`,
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

export async function recordOfflineSale(
  actor: StaffSession,
  input: OfflineSaleInput,
): Promise<Result<OfflineSaleSuccess, SalesActionError>> {
  try {
    return await prisma.$transaction(async (tx) => {
      const customer = await resolveSaleCustomer(tx, input);
      if (!customer.ok) return customer;

      const lines: Array<{
        product_id: string;
        variant_id?: string;
        product_name: string;
        variant_label?: string;
        sku?: string;
        quantity: number;
        unit_price: string;
        stock_state: "reserved" | "committed";
      }> = [];
      let total = 0;
      const stockKind: OperationalStockMutationKind =
        input.paymentStatus === "pending" ? "reserve" : "sell-available";

      for (const [index, line] of input.lines.entries()) {
        if (!Number.isInteger(line.quantity) || line.quantity < 1) {
          return err({
            code: "invalid-quantity",
            message: "Each sale quantity must be a whole number greater than zero.",
            field: `lines.${index}.quantity`,
            productId: line.productId,
            variantId: line.variantId,
            requested: line.quantity,
          });
        }
        if (!Number.isFinite(line.unitPrice) || line.unitPrice < 0) {
          return err({
            code: "invalid-price",
            message: "Each final selling price must be zero or greater.",
            field: `lines.${index}.unitPrice`,
            productId: line.productId,
            variantId: line.variantId,
          });
        }

        const product = await tx.products.findUnique({
          where: { id: line.productId },
          select: {
            id: true,
            name: true,
            inventory_mode: true,
            sku: true,
            product_variants: {
              where: line.variantId ? { id: line.variantId } : undefined,
              select: { id: true, label: true, sku: true },
            },
          },
        });
        if (!product) {
          return err({
            code: "product-not-found",
            message: "The selected product could not be found.",
            field: `lines.${index}.productId`,
            productId: line.productId,
          });
        }
        if (product.inventory_mode === "variant" && !line.variantId) {
          return err({
            code: "variant-required",
            message: "Choose the exact variant being sold.",
            field: `lines.${index}.variantId`,
            productId: line.productId,
          });
        }
        if (product.inventory_mode !== "variant" && line.variantId) {
          return err({
            code: "variant-not-allowed",
            message: "This product does not use variants.",
            field: `lines.${index}.variantId`,
            productId: line.productId,
            variantId: line.variantId,
          });
        }
        const variant = line.variantId ? product.product_variants[0] : undefined;
        if (line.variantId && !variant) {
          return err({
            code: "variant-not-found",
            message: "The selected variant does not belong to this product.",
            field: `lines.${index}.variantId`,
            productId: line.productId,
            variantId: line.variantId,
          });
        }

        await applyOperationalStockMutation(tx, {
          productId: line.productId,
          ...(line.variantId ? { variantId: line.variantId } : {}),
          quantity: line.quantity,
          kind: stockKind,
          actorProfileId: actor.authUserId,
          note:
            input.paymentStatus === "pending"
              ? "Reserved through a pending offline sale."
              : "Sold through the Record Sale workflow.",
          metadata: { channel: input.channel, operation: "offline-sale" },
        });

        total += line.unitPrice * line.quantity;
        lines.push({
          product_id: line.productId,
          ...(line.variantId ? { variant_id: line.variantId } : {}),
          product_name: product.name,
          ...(variant?.label ? { variant_label: variant.label } : {}),
          ...(variant?.sku || product.sku ? { sku: variant?.sku ?? product.sku ?? undefined } : {}),
          quantity: line.quantity,
          unit_price: line.unitPrice.toFixed(2),
          stock_state: input.paymentStatus === "pending" ? "reserved" : "committed",
        });
      }

      const orderNumber = createOrderNumber();
      const paymentStatus = databasePaymentStatus(input.paymentStatus);
      const fulfilmentStatus = input.paymentStatus === "pending" ? "unfulfilled" : "delivered";
      const displayStatus: OrderStatus =
        input.paymentStatus === "pending" ? "pending-payment" : "delivered";
      const created = await tx.orders.create({
        data: {
          order_number: orderNumber,
          customer_id: customer.value.id,
          source: "offline-sale",
          channel: input.channel,
          payment_status: paymentStatus,
          payment_method: input.paymentMethod,
          fulfilment_method: "pickup",
          fulfilment_status: fulfilmentStatus,
          customer_name: customer.value.name,
          customer_email: customer.value.email,
          delivery_name: customer.value.name,
          delivery_phone: customer.value.phone,
          delivery_city: customer.value.city,
          currency: "NGN",
          subtotal: total.toFixed(2),
          total: total.toFixed(2),
          paid_at: input.paymentStatus === "paid" ? new Date() : null,
          notes: input.notes,
          attention: input.paymentStatus === "pending" ? "payment" : null,
          created_by_profile_id: actor.authUserId,
          order_lines: { create: lines },
          order_timeline_events: {
            create: {
              status: displayStatus,
              actor_profile_id: actor.authUserId,
              note:
                input.paymentStatus === "pending"
                  ? "Offline sale recorded with payment still pending."
                  : "Offline sale completed and stock marked as sold.",
            },
          },
          order_payment_events: {
            create: {
              kind: input.paymentStatus === "pending" ? "pending" : "succeeded",
              status: input.paymentStatus === "pending" ? "pending" : "success",
              amount: input.paymentStatus === "pending" ? "0.00" : total.toFixed(2),
              currency: "NGN",
              method: input.paymentMethod,
              actor_profile_id: actor.authUserId,
              note: "Payment state captured through Record Sale.",
            },
          },
        },
        include: adminOrderInclude,
      });

      await tx.stock_movements.updateMany({
        where: {
          related_order_id: null,
          actor_profile_id: actor.authUserId,
          metadata: { path: ["operation"], equals: "offline-sale" },
          occurred_at: { gte: new Date(Date.now() - 60_000) },
        },
        data: { related_order_id: created.id },
      });

      await tx.activity_events.create({
        data: {
          kind: "sale",
          title: `Offline sale ${orderNumber} recorded`,
          detail: `${input.lines.reduce((sum, line) => sum + line.quantity, 0)} unit${input.lines.reduce((sum, line) => sum + line.quantity, 0) === 1 ? "" : "s"} · ${input.channel.replaceAll("-", " ")}`,
          actor_profile_id: actor.authUserId,
          order_id: created.id,
          customer_id: customer.value.id,
        },
      });

      const mapped = mapAdminOrderRow(created);
      return ok({
        order: mapped,
        customerId: customer.value.id,
        message: `Offline sale ${mapped.id} was recorded for ${customer.value.name}.`,
      });
    });
  } catch (error) {
    if (error instanceof OperationalStockError) {
      const conflicts =
        error.code === "insufficient-available-stock"
          ? await findConflictingHoldIds(error.context.productId, error.context.variantId)
          : [];
      return err({
        ...mapStockError(error),
        ...(conflicts.length ? { conflictingHoldIds: conflicts } : {}),
      });
    }
    throw error;
  }
}

function orderLineStockPlan(
  current: Prisma.order_line_stock_state,
  currentStatus: OrderStatus,
  nextStatus: OrderStatus,
): { mutation: OperationalStockMutationKind | null; nextStockState: Prisma.order_line_stock_state } {
  if (nextStatus === "payment-confirmed") {
    if (current === "reserved") return { mutation: "sell-reserved", nextStockState: "committed" };
    if (current === "uncommitted") return { mutation: "sell-available", nextStockState: "committed" };
  }
  if (nextStatus === "cancelled") {
    if (current === "reserved") return { mutation: "release-reserved", nextStockState: "released" };
    if (current === "committed") return { mutation: "restore-sold", nextStockState: "released" };
    return { mutation: null, nextStockState: "released" };
  }
  if (nextStatus === "refunded") {
    if (current === "reserved") return { mutation: "release-reserved", nextStockState: "released" };
    if (current === "committed" && currentStatus !== "delivered") {
      return { mutation: "restore-sold", nextStockState: "released" };
    }
  }
  if (nextStatus === "returned") {
    if (current === "committed") return { mutation: "return-sold", nextStockState: "returned" };
    if (current === "reserved") return { mutation: "release-reserved", nextStockState: "released" };
  }
  return { mutation: null, nextStockState: current };
}

function orderAggregateUpdate(
  order: { fulfilment_method: Prisma.fulfilment_method; refunded_amount: Prisma.Decimal; total: Prisma.Decimal },
  nextStatus: OrderStatus,
): Prisma.ordersUpdateInput {
  switch (nextStatus) {
    case "pending-payment":
      return { payment_status: "pending", fulfilment_status: "unfulfilled", attention: "payment" };
    case "payment-confirmed":
      return { payment_status: "paid", fulfilment_status: "unfulfilled", attention: null, paid_at: new Date() };
    case "preparing":
      return { fulfilment_status: "processing", attention: "packing" };
    case "packed":
      return { fulfilment_status: "ready_for_dispatch", attention: null };
    case "ready-for-pickup":
      return { fulfilment_method: "pickup", fulfilment_status: "ready_for_dispatch", attention: null };
    case "dispatched":
    case "out-for-delivery":
      return { fulfilment_status: "dispatched" };
    case "delivered":
      return { fulfilment_status: "delivered", attention: null };
    case "cancelled":
      return { payment_status: "cancelled", fulfilment_status: "cancelled", attention: null };
    case "refunded":
      return {
        payment_status: "refunded",
        refunded_amount: order.total.minus(order.refunded_amount).plus(order.refunded_amount),
        attention: null,
      };
    case "returned":
      return { fulfilment_status: "returned", attention: "return" };
  }
}

async function resolveSaleCustomer(
  tx: Prisma.TransactionClient,
  input: OfflineSaleInput,
): Promise<Result<{ id: string; name: string; email: string | null; phone: string | null; city: string | null }, SalesActionError>> {
  if (input.customer.kind === "existing") {
    const customer = await tx.customers.findUnique({ where: { id: input.customer.customerId } });
    if (!customer) {
      return err({
        code: "customer-not-found",
        message: "The selected customer could not be found.",
        field: "customer",
      });
    }
    return ok(customer);
  }

  const customer = await tx.customers.create({
    data: {
      name: input.customer.name.trim() || "Walk-in customer",
      email: input.customer.email.trim() || null,
      phone: input.customer.phone.trim() || null,
      city: input.customer.city.trim() || "Lagos",
      type: "individual",
    },
  });
  return ok(customer);
}

function databasePaymentStatus(status: OfflineSaleInput["paymentStatus"]) {
  if (status === "paid") return "paid" as const;
  if (status === "deposit") return "processing" as const;
  return "pending" as const;
}

function mapStockError(error: OperationalStockError, orderId?: string): SalesActionError {
  const code =
    error.code === "stock-level-not-found"
      ? "product-not-found"
      : error.code === "stock-write-conflict"
        ? "insufficient-available-stock"
        : error.code;
  return {
    code: code as SalesActionError["code"],
    message: error.message,
    productId: error.context.productId,
    variantId: error.context.variantId,
    requested: error.context.requested,
    available: error.context.available,
    ...(orderId ? { orderId } : {}),
  };
}

async function findConflictingHoldIds(productId: string, variantId?: string) {
  const rows = await prisma.holds.findMany({
    where: {
      product_id: productId,
      variant_id: variantId ?? null,
      status: "active",
      expires_at: { gt: new Date() },
    },
    select: { id: true },
  });
  return rows.map((row) => row.id);
}

function createOrderNumber() {
  return `LS-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}
