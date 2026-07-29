import "server-only";

import { createHash } from "node:crypto";
import { err, ok, type Result } from "@/lib/errors";
import type { Prisma } from "@/lib/prisma";
import { prisma } from "@/lib/prisma";
import { createCheckoutSchema } from "@/modules/checkout/schema";
import type {
  CheckoutDraft,
  CheckoutError,
  CheckoutIdentity,
  CreateCheckoutInput,
} from "@/modules/checkout/types";
import {
  applyOperationalStockMutation,
  OperationalStockError,
} from "@/modules/inventory/server/operational-stock";
import { initializeTransaction } from "@/modules/payments/server/paystack";

const IDEMPOTENCY_SCOPE = "checkout.create";
const HOLD_DURATION_MS = 15 * 60 * 1_000;
const MAX_REFERENCE_ATTEMPTS = 3;

class ExpectedCheckoutError extends Error {
  constructor(readonly detail: CheckoutError) {
    super(detail.message);
    this.name = "ExpectedCheckoutError";
  }
}

type DraftLine = {
  productId: string;
  variantId?: string;
  holdId?: string;
  productName: string;
  variantLabel?: string;
  sku?: string;
  quantity: number;
  unitPriceMinor: number;
};

type PendingDraft = CheckoutDraft & { idempotencyRecordId: string };

export async function createCheckout(
  identity: CheckoutIdentity,
  input: CreateCheckoutInput,
): Promise<Result<CheckoutDraft, CheckoutError>> {
  const parsed = createCheckoutSchema.safeParse(input);
  if (!parsed.success) {
    return err({
      code: "CHECKOUT_INVALID",
      message: parsed.error.issues[0]?.message ?? "Checkout details are invalid.",
      field: parsed.error.issues[0]?.path.join("."),
    });
  }
  if (!identity.email) {
    return err({
      code: "CHECKOUT_INVALID",
      message: "Add an email address to your account before starting payment.",
      field: "email",
    });
  }

  const requestHash = hashCheckoutRequest(identity.customerId, parsed.data);
  const existing = await findIdempotentCheckout(parsed.data.idempotencyKey, requestHash);
  if (existing) return existing;

  let draft: PendingDraft | null = null;
  for (let attempt = 0; attempt < MAX_REFERENCE_ATTEMPTS; attempt += 1) {
    try {
      draft = await createPendingDraft(identity, parsed.data, requestHash);
      break;
    } catch (error) {
      if (error instanceof ExpectedCheckoutError) return err(error.detail);
      if (error instanceof OperationalStockError) return err(mapStockError(error));
      if (!isUniqueConstraintError(error)) throw error;

      const replay = await findIdempotentCheckout(parsed.data.idempotencyKey, requestHash);
      if (replay) return replay;
      if (attempt === MAX_REFERENCE_ATTEMPTS - 1) {
        return err({
          code: "CHECKOUT_IDEMPOTENCY_CONFLICT",
          message: "Checkout could not allocate a unique payment reference. Try again.",
        });
      }
    }
  }
  if (!draft) {
    return err({ code: "CHECKOUT_IN_PROGRESS", message: "Checkout is already being created." });
  }

  try {
    const checkout = await initializeTransaction({
      email: identity.email,
      amountMinor: draft.totalMinor,
      reference: draft.reference,
      callbackUrl: parsed.data.callbackUrl,
      currency: draft.currency,
      metadata: {
        checkoutId: draft.checkoutId,
        orderNumber: draft.orderNumber,
        paymentId: draft.paymentId,
        customerId: identity.customerId,
      },
    });
    if (checkout.reference !== draft.reference) {
      throw new Error("Paystack returned a different transaction reference.");
    }

    await prisma.payments.update({
      where: { id: draft.paymentId },
      data: {
        access_code: checkout.accessCode,
        status: "initialized",
        raw_response: checkout.rawResponse as Prisma.InputJsonValue,
      },
    });
    await prisma.holds.updateMany({
      where: { order_id: draft.checkoutId, status: "active" },
      data: { stage: "payment", payment_progress: "initialized" },
    });
    return ok({ ...draft, accessCode: checkout.accessCode, status: "initialized" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Paystack initialization failed.";
    await prisma.payments.update({
      where: { id: draft.paymentId },
      data: { status: "failed", failure_code: "PAYSTACK_INITIALIZATION_FAILED", failure_reason: message },
    });
    await prisma.holds.updateMany({
      where: { order_id: draft.checkoutId, status: "active" },
      data: { payment_progress: "failed" },
    });
    return err({
      code: "PAYMENT_INITIALIZATION_FAILED",
      message: "Payment could not be initialized. Your order remains unpaid.",
      checkoutId: draft.checkoutId,
      paymentId: draft.paymentId,
    });
  }
}

async function createPendingDraft(
  identity: CheckoutIdentity,
  input: CreateCheckoutInput,
  requestHash: string,
): Promise<PendingDraft> {
  const now = new Date();
  const reference = `LS-CHECKOUT-${crypto.randomUUID().replaceAll("-", "")}`;
  const orderNumber = `LS-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

  return prisma.$transaction(
    async (tx) => {
      const idempotency = await tx.idempotency_records.create({
        data: {
          scope: IDEMPOTENCY_SCOPE,
          idempotency_key: input.idempotencyKey,
          request_hash: requestHash,
          status: "in_progress",
          expires_at: new Date(now.getTime() + 24 * 60 * 60 * 1_000),
        },
      });

      const address = await tx.customer_addresses.findFirst({
        where: { id: input.addressId, customer_id: identity.customerId },
      });
      if (!address) {
        throw expected("RESOURCE_NOT_OWNED", "The selected address does not belong to this account.", "addressId");
      }
      const deliveryZone = await tx.delivery_zones.findFirst({
        where: { id: input.deliveryZoneId, enabled: true },
      });
      if (!deliveryZone) {
        throw expected("CHECKOUT_INVALID", "The selected delivery zone is unavailable.", "deliveryZoneId");
      }

      const products = await tx.products.findMany({
        where: { id: { in: input.lines.map((line) => line.productId) } },
        select: {
          id: true,
          name: true,
          price: true,
          sku: true,
          inventory_mode: true,
          lifecycle: true,
          publication: true,
          product_variants: { select: { id: true, label: true, sku: true, price: true } },
        },
      });
      const productById = new Map(products.map((product) => [product.id, product]));
      const lines = input.lines.map((line, index) => {
        const product = productById.get(line.productId);
        if (!product || product.lifecycle !== "active" || product.publication !== "published") {
          throw expected(
            "CHECKOUT_PRODUCT_UNAVAILABLE",
            "A product in this checkout is no longer available.",
            `lines.${index}.productId`,
          );
        }
        const variant = line.variantId
          ? product.product_variants.find((candidate) => candidate.id === line.variantId)
          : undefined;
        if (
          (product.inventory_mode === "variant" && !variant) ||
          (product.inventory_mode !== "variant" && line.variantId)
        ) {
          throw expected(
            "CHECKOUT_VARIANT_INVALID",
            "The selected variant does not belong to this product.",
            `lines.${index}.variantId`,
          );
        }
        return {
          productId: product.id,
          ...(variant ? { variantId: variant.id, variantLabel: variant.label } : {}),
          ...(line.holdId ? { holdId: line.holdId } : {}),
          productName: product.name,
          ...(variant?.sku ?? product.sku ? { sku: variant?.sku ?? product.sku ?? undefined } : {}),
          quantity: line.quantity,
          unitPriceMinor: decimalToMinor(variant?.price ?? product.price),
        } satisfies DraftLine;
      });

      const subtotalMinor = lines.reduce(
        (total, line) => total + line.unitPriceMinor * line.quantity,
        0,
      );
      const deliveryFeeMinor = decimalToMinor(deliveryZone.rate);
      const totalMinor = subtotalMinor + deliveryFeeMinor;
      const order = await tx.orders.create({
        data: {
          order_number: orderNumber,
          customer_id: identity.customerId,
          source: "storefront-checkout",
          channel: "online",
          payment_status: "pending",
          payment_method: "paystack",
          fulfilment_method: "delivery",
          fulfilment_status: "unfulfilled",
          delivery_zone_id: deliveryZone.id,
          customer_name: identity.displayName,
          customer_email: identity.email,
          delivery_name: identity.displayName,
          delivery_phone: identity.phone,
          delivery_city: address.city,
          delivery_address: {
            line1: address.line1,
            line2: address.line2,
            city: address.city,
            state: address.state,
            country: address.country,
            notes: address.delivery_notes,
          },
          currency: "NGN",
          subtotal: minorToDecimal(subtotalMinor),
          delivery_fee: minorToDecimal(deliveryFeeMinor),
          discount_amount: "0.00",
          total: minorToDecimal(totalMinor),
          attention: "payment",
          created_by_profile_id: identity.authUserId,
          order_lines: {
            create: lines.map((line) => ({
              product_id: line.productId,
              ...(line.variantId ? { variant_id: line.variantId } : {}),
              product_name: line.productName,
              ...(line.variantLabel ? { variant_label: line.variantLabel } : {}),
              ...(line.sku ? { sku: line.sku } : {}),
              quantity: line.quantity,
              unit_price: minorToDecimal(line.unitPriceMinor),
              stock_state: "reserved",
            })),
          },
        },
        include: { order_lines: true },
      });

      for (const line of lines) {
        await attachCheckoutHold(tx, identity, order.id, orderNumber, line, now);
      }
      const payment = await tx.payments.create({
        data: {
          order_id: order.id,
          provider: "paystack",
          reference,
          amount: minorToDecimal(totalMinor),
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
          amount: minorToDecimal(totalMinor),
          currency: "NGN",
          method: "paystack",
          actor_profile_id: identity.authUserId,
          note: "Storefront checkout payment attempt created.",
          metadata: { reference },
        },
      });
      await tx.order_timeline_events.create({
        data: {
          order_id: order.id,
          status: "pending-payment",
          actor_profile_id: identity.authUserId,
          note: "Checkout created with stock reserved pending verified payment.",
          metadata: { paymentId: payment.id, reference },
        },
      });

      const snapshot: PendingDraft = {
        checkoutId: order.id,
        paymentId: payment.id,
        orderNumber: order.order_number,
        reference: payment.reference,
        accessCode: null,
        status: "initializing",
        currency: "NGN",
        subtotalMinor,
        deliveryFeeMinor,
        discountMinor: 0,
        totalMinor,
        idempotencyRecordId: idempotency.id,
      };
      await tx.idempotency_records.update({
        where: { id: idempotency.id },
        data: {
          status: "completed",
          response_snapshot: snapshot as unknown as Prisma.InputJsonValue,
          completed_at: new Date(),
        },
      });
      return snapshot;
    },
    { isolationLevel: "Serializable" },
  );
}

async function attachCheckoutHold(
  tx: Prisma.TransactionClient,
  identity: CheckoutIdentity,
  orderId: string,
  orderNumber: string,
  line: DraftLine,
  now: Date,
) {
  const expiresAt = new Date(now.getTime() + HOLD_DURATION_MS);
  if (line.holdId) {
    const hold = await tx.holds.findUnique({ where: { id: line.holdId } });
    if (
      !hold ||
      hold.customer_id !== identity.customerId ||
      hold.product_id !== line.productId ||
      hold.variant_id !== (line.variantId ?? null) ||
      hold.quantity !== line.quantity
    ) {
      throw expected("RESOURCE_NOT_OWNED", "The selected hold does not match this checkout.");
    }
    if (hold.status !== "active" || hold.expires_at <= now) {
      throw expected("CHECKOUT_HOLD_EXPIRED", "A checkout hold has expired. Refresh your cart.");
    }
    const claimed = await tx.holds.updateMany({
      where: { id: hold.id, status: "active", expires_at: { gt: now } },
      data: {
        order_id: orderId,
        stage: "payment",
        payment_progress: "not_started",
        expires_at: expiresAt,
      },
    });
    if (claimed.count !== 1) {
      throw expected("CHECKOUT_HOLD_EXPIRED", "A checkout hold changed or expired. Refresh your cart.");
    }
    return;
  }

  const reusable = await tx.holds.findFirst({
    where: {
      customer_id: identity.customerId,
      product_id: line.productId,
      variant_id: line.variantId ?? null,
      quantity: line.quantity,
      status: "active",
      expires_at: { gt: now },
      order_id: null,
    },
  });
  if (reusable) {
    const claimed = await tx.holds.updateMany({
      where: { id: reusable.id, status: "active", expires_at: { gt: now } },
      data: {
        order_id: orderId,
        stage: "payment",
        payment_progress: "not_started",
        expires_at: expiresAt,
      },
    });
    if (claimed.count !== 1) {
      throw expected("CHECKOUT_HOLD_EXPIRED", "A checkout hold changed or expired. Refresh your cart.");
    }
    return;
  }

  const hold = await tx.holds.create({
    data: {
      customer_id: identity.customerId,
      product_id: line.productId,
      variant_id: line.variantId,
      order_id: orderId,
      quantity: line.quantity,
      stage: "payment",
      source: "storefront",
      payment_progress: "not_started",
      status: "active",
      expires_at: expiresAt,
      note: `Reserved for checkout ${orderNumber}.`,
    },
  });
  await applyOperationalStockMutation(tx, {
    productId: line.productId,
    ...(line.variantId ? { variantId: line.variantId } : {}),
    quantity: line.quantity,
    kind: "reserve",
    actorProfileId: identity.authUserId,
    note: `Reserved for checkout ${orderNumber}.`,
    relatedOrderId: orderId,
    relatedHoldId: hold.id,
    metadata: { operation: "storefront-checkout" },
  });
}

async function findIdempotentCheckout(
  idempotencyKey: string,
  requestHash: string,
): Promise<Result<CheckoutDraft, CheckoutError> | null> {
  const record = await prisma.idempotency_records.findUnique({
    where: {
      scope_idempotency_key: { scope: IDEMPOTENCY_SCOPE, idempotency_key: idempotencyKey },
    },
  });
  if (!record) return null;
  if (record.request_hash !== requestHash) {
    return err({
      code: "CHECKOUT_IDEMPOTENCY_CONFLICT",
      message: "This idempotency key was already used for different checkout details.",
    });
  }
  if (record.status !== "completed" || !record.response_snapshot) {
    return err({ code: "CHECKOUT_IN_PROGRESS", message: "Checkout is already being created." });
  }
  return ok(record.response_snapshot as unknown as CheckoutDraft);
}

function expected(code: CheckoutError["code"], message: string, field?: string) {
  return new ExpectedCheckoutError({ code, message, ...(field ? { field } : {}) });
}

function hashCheckoutRequest(customerId: string, input: CreateCheckoutInput) {
  return createHash("sha256").update(JSON.stringify({ customerId, input })).digest("hex");
}

function decimalToMinor(value: { toString(): string }) {
  return Math.round(Number(value.toString()) * 100);
}

function minorToDecimal(amountMinor: number) {
  return (amountMinor / 100).toFixed(2);
}

function isUniqueConstraintError(error: unknown) {
  return Boolean(error && typeof error === "object" && Reflect.get(error, "code") === "P2002");
}

function mapStockError(error: OperationalStockError): CheckoutError {
  return {
    code: "STOCK_NOT_AVAILABLE",
    message: error.message,
  };
}
