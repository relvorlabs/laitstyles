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
  OrderStatus,
  OrderTransitionSuccess,
  SalesActionError,
} from "@/modules/orders/types";
import {
  initializePaystackTransaction,
  isPaystackConfigured,
  PaystackConfigurationError,
  PaystackInitializationError,
} from "@/modules/payments/server/paystack";
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

type OfflineSaleDraft = {
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  paymentId: string;
  reference: string;
  amountKobo: number;
  lines: Array<{ id: string; productId: string; variantId?: string; quantity: number }>;
};

type OfflineSaleLineDraft = {
  productId: string;
  variantId?: string;
  productName: string;
  variantLabel?: string;
  sku?: string;
  quantity: number;
  unitPriceKobo: number;
};

export async function recordOfflineSale(
  actor: StaffSession,
  input: OfflineSaleInput,
): Promise<Result<OfflineSaleSuccess, SalesActionError>> {
  if (!isPaystackConfigured()) {
    return err({
      code: "paystack-not-configured",
      message:
        "Paystack checkout is not configured yet. No order or stock reservation was created.",
    });
  }

  let draft: OfflineSaleDraft | null = null;
  try {
    const draftResult = await createOfflineSaleDraft(actor, input);
    if (!draftResult.ok) return draftResult;
    draft = draftResult.value;

    const checkout = await initializePaystackTransaction({
      email: draft.customerEmail,
      amountKobo: draft.amountKobo,
      reference: draft.reference,
      metadata: {
        orderId: draft.orderId,
        orderNumber: draft.orderNumber,
        source: "in-person-admin-sale",
        channel: input.channel,
      },
    });

    if (checkout.reference !== draft.reference) {
      throw new PaystackInitializationError(
        "Paystack returned a transaction reference that does not match the recorded payment attempt.",
        checkout.rawResponse,
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.payments.update({
        where: { id: draft.paymentId },
        data: {
          status: "initialized",
          access_code: checkout.accessCode,
          raw_response: checkout.rawResponse as Prisma.InputJsonValue,
        },
      });
      await tx.order_payment_events.create({
        data: {
          order_id: draft.orderId,
          payment_id: draft.paymentId,
          kind: "initialized",
          status: "initialized",
          amount: (draft.amountKobo / 100).toFixed(2),
          currency: "NGN",
          method: "paystack",
          actor_profile_id: actor.authUserId,
          note: "One-time Paystack checkout generated for an in-person sale.",
          metadata: { reference: draft.reference },
        },
      });
      await tx.order_timeline_events.create({
        data: {
          order_id: draft.orderId,
          status: "pending-payment",
          actor_profile_id: actor.authUserId,
          note: "Paystack checkout generated. Awaiting server-verified payment.",
          metadata: { paymentReference: draft.reference },
        },
      });
      await tx.activity_events.create({
        data: {
          kind: "sale",
          title: `Paystack checkout generated for ${draft.orderNumber}`,
          detail: `${draft.lines.reduce((sum, line) => sum + line.quantity, 0)} unit${draft.lines.reduce((sum, line) => sum + line.quantity, 0) === 1 ? "" : "s"} · ${input.channel.replaceAll("-", " ")}`,
          actor_profile_id: actor.authUserId,
          order_id: draft.orderId,
          customer_id: draft.customerId,
        },
      });
      return tx.orders.findUniqueOrThrow({
        where: { id: draft.orderId },
        include: adminOrderInclude,
      });
    });

    const order = mapAdminOrderRow(updated);
    return ok({
      order,
      customerId: draft.customerId,
      checkout: {
        authorizationUrl: checkout.authorizationUrl,
        accessCode: checkout.accessCode,
        reference: checkout.reference,
      },
      message: `Paystack checkout generated for ${draft.customerName}.`,
    });
  } catch (error) {
    if (draft) await cancelFailedOfflineSaleDraft(actor, draft, error);
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
    if (error instanceof PaystackConfigurationError) {
      return err({
        code: "paystack-not-configured",
        message: "Paystack checkout is not configured for this environment.",
      });
    }
    if (error instanceof PaystackInitializationError) {
      return err({
        code: "paystack-initialization-failed",
        message: `Paystack checkout could not be generated. ${error.message}`,
        ...(draft ? { orderId: draft.orderNumber } : {}),
      });
    }
    throw error;
  }
}

async function createOfflineSaleDraft(
  actor: StaffSession,
  input: OfflineSaleInput,
): Promise<Result<OfflineSaleDraft, SalesActionError>> {
  try {
    return await prisma.$transaction(async (tx) => {
      const customer = await resolveSaleCustomer(tx, input);
      if (!customer.ok) return customer;

      const lineDrafts: OfflineSaleLineDraft[] = [];
      let amountKobo = 0;
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

        const unitPriceKobo = Math.round(line.unitPrice * 100);
        amountKobo += unitPriceKobo * line.quantity;
        lineDrafts.push({
          productId: line.productId,
          ...(line.variantId ? { variantId: line.variantId } : {}),
          productName: product.name,
          ...(variant?.label ? { variantLabel: variant.label } : {}),
          ...(variant?.sku || product.sku ? { sku: variant?.sku ?? product.sku ?? undefined } : {}),
          quantity: line.quantity,
          unitPriceKobo,
        });
      }

      if (amountKobo < 10_000) {
        return err({
          code: "invalid-price",
          message: "The checkout total must be at least ₦100.",
          field: "lines",
        });
      }

      const orderNumber = createOrderNumber();
      const reference = createPaymentReference();
      const order = await tx.orders.create({
        data: {
          order_number: orderNumber,
          customer_id: customer.value.id,
          source: "offline-sale",
          channel: input.channel,
          payment_status: "pending",
          payment_method: "paystack",
          fulfilment_method: "pickup",
          fulfilment_status: "unfulfilled",
          customer_name: customer.value.name,
          customer_email: customer.value.email,
          delivery_name: customer.value.name,
          delivery_phone: customer.value.phone,
          delivery_city: customer.value.city,
          currency: "NGN",
          subtotal: (amountKobo / 100).toFixed(2),
          total: (amountKobo / 100).toFixed(2),
          notes: input.notes,
          attention: "payment",
          created_by_profile_id: actor.authUserId,
          order_lines: {
            create: lineDrafts.map((line) => ({
              product_id: line.productId,
              ...(line.variantId ? { variant_id: line.variantId } : {}),
              product_name: line.productName,
              ...(line.variantLabel ? { variant_label: line.variantLabel } : {}),
              ...(line.sku ? { sku: line.sku } : {}),
              quantity: line.quantity,
              unit_price: (line.unitPriceKobo / 100).toFixed(2),
              stock_state: "reserved",
            })),
          },
          order_timeline_events: {
            create: {
              status: "pending-payment",
              actor_profile_id: actor.authUserId,
              note: "In-person order created. Stock reserved while Paystack checkout is initialized.",
              metadata: { paymentReference: reference },
            },
          },
        },
        include: { order_lines: true },
      });

      const payment = await tx.payments.create({
        data: {
          order_id: order.id,
          provider: "paystack",
          reference,
          amount: (amountKobo / 100).toFixed(2),
          currency: "NGN",
          status: "initializing",
        },
      });
      await tx.order_payment_events.create({
        data: {
          order_id: order.id,
          payment_id: payment.id,
          kind: "attempt_created",
          status: "initializing",
          amount: (amountKobo / 100).toFixed(2),
          currency: "NGN",
          method: "paystack",
          actor_profile_id: actor.authUserId,
          note: "Paystack payment attempt created for an in-person sale.",
          metadata: { reference },
        },
      });

      for (const line of order.order_lines) {
        await applyOperationalStockMutation(tx, {
          productId: line.product_id,
          ...(line.variant_id ? { variantId: line.variant_id } : {}),
          quantity: line.quantity,
          kind: "reserve",
          actorProfileId: actor.authUserId,
          note: `Reserved for in-person order ${orderNumber}.`,
          relatedOrderId: order.id,
          metadata: {
            operation: "offline-sale-checkout",
            orderLineId: line.id,
            paymentReference: reference,
          },
        });
      }

      return ok({
        orderId: order.id,
        orderNumber,
        customerId: customer.value.id,
        customerName: customer.value.name,
        customerEmail: customer.value.email,
        paymentId: payment.id,
        reference,
        amountKobo,
        lines: order.order_lines.map((line) => ({
          id: line.id,
          productId: line.product_id,
          ...(line.variant_id ? { variantId: line.variant_id } : {}),
          quantity: line.quantity,
        })),
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

async function cancelFailedOfflineSaleDraft(
  actor: StaffSession,
  draft: OfflineSaleDraft,
  failure: unknown,
) {
  const failureMessage =
    failure instanceof Error ? failure.message : "Paystack checkout initialization failed.";

  await prisma.$transaction(async (tx) => {
    for (const line of draft.lines) {
      await applyOperationalStockMutation(tx, {
        productId: line.productId,
        ...(line.variantId ? { variantId: line.variantId } : {}),
        quantity: line.quantity,
        kind: "release-reserved",
        actorProfileId: actor.authUserId,
        note: `Released after checkout initialization failed for ${draft.orderNumber}.`,
        relatedOrderId: draft.orderId,
        metadata: {
          operation: "offline-sale-checkout-failed",
          orderLineId: line.id,
          paymentReference: draft.reference,
        },
      });
      await tx.order_lines.update({
        where: { id: line.id },
        data: { stock_state: "released" },
      });
    }

    await tx.payments.update({
      where: { id: draft.paymentId },
      data: { status: "failed", gateway_response: failureMessage },
    });
    await tx.orders.update({
      where: { id: draft.orderId },
      data: { payment_status: "cancelled", fulfilment_status: "cancelled", attention: null },
    });
    await tx.order_payment_events.create({
      data: {
        order_id: draft.orderId,
        payment_id: draft.paymentId,
        kind: "failed",
        status: "failed",
        amount: (draft.amountKobo / 100).toFixed(2),
        currency: "NGN",
        method: "paystack",
        actor_profile_id: actor.authUserId,
        note: failureMessage,
        metadata: { reference: draft.reference },
      },
    });
    await tx.order_timeline_events.create({
      data: {
        order_id: draft.orderId,
        status: "cancelled",
        actor_profile_id: actor.authUserId,
        note: "Order cancelled and reserved stock released because Paystack checkout was not initialized.",
        metadata: { paymentReference: draft.reference },
      },
    });
    await tx.activity_events.create({
      data: {
        kind: "sale",
        title: `Checkout failed for ${draft.orderNumber}`,
        detail: "Order cancelled and reserved stock released.",
        actor_profile_id: actor.authUserId,
        order_id: draft.orderId,
        customer_id: draft.customerId,
      },
    });
  });
}

function orderLineStockPlan(
  current: Prisma.order_line_stock_state,
  currentStatus: OrderStatus,
  nextStatus: OrderStatus,
): { mutation: OperationalStockMutationKind | null; nextStockState: Prisma.order_line_stock_state } {
  if (nextStatus === "payment-confirmed") {
    if (current === "reserved") return { mutation: "commit-reserved", nextStockState: "committed" };
    if (current === "uncommitted") return { mutation: "commit-available", nextStockState: "committed" };
  }
  if (nextStatus === "delivered" && current === "committed") {
    return { mutation: "sell-committed", nextStockState: "committed" };
  }
  if (nextStatus === "cancelled") {
    if (current === "reserved") return { mutation: "release-reserved", nextStockState: "released" };
    if (current === "committed") return { mutation: "release-committed", nextStockState: "released" };
    return { mutation: null, nextStockState: "released" };
  }
  if (nextStatus === "refunded") {
    if (current === "reserved") return { mutation: "release-reserved", nextStockState: "released" };
    if (current === "committed" && currentStatus !== "delivered") {
      return { mutation: "release-committed", nextStockState: "released" };
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
      return { payment_status: "refunded", refunded_amount: order.total, attention: null };
    case "returned":
      return { fulfilment_status: "returned", attention: "return" };
  }
}

async function resolveSaleCustomer(
  tx: Prisma.TransactionClient,
  input: OfflineSaleInput,
): Promise<Result<{ id: string; name: string; email: string; phone: string | null; city: string | null }, SalesActionError>> {
  if (input.customer.kind === "existing") {
    const customer = await tx.customers.findUnique({ where: { id: input.customer.customerId } });
    if (!customer) {
      return err({
        code: "customer-not-found",
        message: "The selected customer could not be found.",
        field: "customer",
      });
    }
    const email = customer.email?.trim();
    if (!email) {
      return err({
        code: "customer-email-required",
        message: "Add an email address to this customer before generating Paystack checkout.",
        field: "customer",
      });
    }
    return ok({ ...customer, email });
  }

  const email = input.customer.email.trim();
  if (!email) {
    return err({
      code: "customer-email-required",
      message: "Enter the customer email required by Paystack.",
      field: "customer.email",
    });
  }

  const customer = await tx.customers.create({
    data: {
      name: input.customer.name.trim() || "Walk-in customer",
      email,
      phone: input.customer.phone.trim() || null,
      city: input.customer.city.trim() || "Lagos",
      type: "individual",
    },
  });
  return ok({ ...customer, email });
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

function createPaymentReference() {
  return `LS-INPERSON-${crypto.randomUUID().replaceAll("-", "")}`;
}
