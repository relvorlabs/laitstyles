import "server-only";

import { err, ok, type Result } from "@/lib/errors";
import type { Prisma } from "@/lib/prisma";
import { prisma } from "@/lib/prisma";
import {
  applyOperationalStockMutation,
  OperationalStockError,
} from "@/modules/inventory/server/operational-stock";
import type { OfflineSaleInput, SalesActionError } from "@/modules/orders/types";
import type { StaffSession } from "@/server/auth/session";

export type OfflineSaleDraft = {
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

export async function createOfflineSaleDraft(
  actor: StaffSession,
  input: OfflineSaleInput,
): Promise<Result<OfflineSaleDraft, SalesActionError>> {
  try {
    return await prisma.$transaction(async (tx) => {
      const lineDrafts: OfflineSaleLineDraft[] = [];
      let amountKobo = 0;
      for (const [index, line] of input.lines.entries()) {
        const lineResult = await resolveSaleLine(tx, line, index);
        if (!lineResult.ok) return lineResult;
        lineDrafts.push(lineResult.value);
        amountKobo += lineResult.value.unitPriceKobo * lineResult.value.quantity;
      }

      if (amountKobo < 10_000) {
        return err({
          code: "invalid-price",
          message: "The checkout total must be at least ₦100.",
          field: "lines",
        });
      }

      const customer = await resolveSaleCustomer(tx, input);
      if (!customer.ok) return customer;

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

async function resolveSaleLine(
  tx: Prisma.TransactionClient,
  line: OfflineSaleInput["lines"][number],
  index: number,
): Promise<Result<OfflineSaleLineDraft, SalesActionError>> {
  if (!Number.isInteger(line.quantity) || line.quantity < 1) {
    return err({
      code: "invalid-quantity",
      message: "Each sale quantity must be a whole number greater than zero.",
      field: `lines.${index}.quantity`,
      productId: line.productId,
      ...(line.variantId ? { variantId: line.variantId } : {}),
      requested: line.quantity,
    });
  }
  if (!Number.isFinite(line.unitPrice) || line.unitPrice < 0) {
    return err({
      code: "invalid-price",
      message: "Each final selling price must be zero or greater.",
      field: `lines.${index}.unitPrice`,
      productId: line.productId,
      ...(line.variantId ? { variantId: line.variantId } : {}),
    });
  }

  const product = await tx.products.findUnique({
    where: { id: line.productId },
    select: {
      name: true,
      inventory_mode: true,
      sku: true,
      product_variants: {
        ...(line.variantId ? { where: { id: line.variantId } } : {}),
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
  const sku = variant?.sku ?? product.sku;

  return ok({
    productId: line.productId,
    ...(line.variantId ? { variantId: line.variantId } : {}),
    productName: product.name,
    ...(variant?.label ? { variantLabel: variant.label } : {}),
    ...(sku ? { sku } : {}),
    quantity: line.quantity,
    unitPriceKobo: Math.round(line.unitPrice * 100),
  });
}

async function resolveSaleCustomer(
  tx: Prisma.TransactionClient,
  input: OfflineSaleInput,
): Promise<
  Result<
    { id: string; name: string; email: string; phone: string | null; city: string | null },
    SalesActionError
  >
> {
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

function mapStockError(error: OperationalStockError): SalesActionError {
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
