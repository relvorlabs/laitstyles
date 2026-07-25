import "server-only";

import { err, ok, type Result } from "@/lib/errors";
import type { Prisma } from "@/lib/prisma";
import { prisma } from "@/lib/prisma";
import {
  applyOperationalStockMutation,
  OperationalStockError,
} from "@/modules/inventory/server/operational-stock";
import { adminHoldInclude, mapAdminHoldRow } from "@/modules/holds/server/mappers";
import type {
  ConvertHoldInput,
  HoldActionError,
  HoldActionSuccess,
} from "@/modules/holds/types";
import { adminOrderInclude, mapAdminOrderRow } from "@/modules/orders/server/mappers";
import type { SalesChannel } from "@/modules/orders/types";
import type { StaffSession } from "@/server/auth/session";

export async function extendHold(
  actor: StaffSession,
  holdId: string,
  minutes: number,
): Promise<Result<HoldActionSuccess, HoldActionError>> {
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 24 * 60) {
    return err({
      code: "invalid-hold-extension",
      message: "Hold extensions must be between 1 minute and 24 hours.",
      holdId,
    });
  }

  return prisma.$transaction(async (tx) => {
    const hold = await findActiveHold(tx, holdId);
    if (!hold.ok) return hold;

    const nextExpiry = new Date(hold.value.expires_at.getTime() + minutes * 60 * 1_000);
    const claimed = await tx.holds.updateMany({
      where: {
        id: holdId,
        status: "active",
        expires_at: hold.value.expires_at,
      },
      data: { expires_at: nextExpiry },
    });
    if (claimed.count !== 1) return holdChangedError(holdId);

    await recordHoldAudit(tx, actor, holdId, "hold.extended", {
      minutes,
      expiresAt: nextExpiry.toISOString(),
    });
    const updated = await tx.holds.findUniqueOrThrow({
      where: { id: holdId },
      include: adminHoldInclude,
    });
    return ok({
      hold: mapAdminHoldRow(updated),
      message: `Hold extended by ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    });
  });
}

export async function releaseHold(
  actor: StaffSession,
  holdId: string,
): Promise<Result<HoldActionSuccess, HoldActionError>> {
  try {
    return await prisma.$transaction(async (tx) => {
      const hold = await findActiveHold(tx, holdId);
      if (!hold.ok) return hold;

      const releasedAt = new Date();
      const claimed = await tx.holds.updateMany({
        where: { id: holdId, status: "active", expires_at: { gt: releasedAt } },
        data: { status: "released", released_at: releasedAt },
      });
      if (claimed.count !== 1) return holdChangedError(holdId);

      await applyOperationalStockMutation(tx, {
        productId: hold.value.product_id,
        ...(hold.value.variant_id ? { variantId: hold.value.variant_id } : {}),
        quantity: hold.value.quantity,
        kind: "release-reserved",
        actorProfileId: actor.authUserId,
        note: "Released from the admin Holds workspace.",
        relatedHoldId: holdId,
        metadata: { operation: "hold-release" },
      });

      await recordHoldAudit(tx, actor, holdId, "hold.released", {
        productId: hold.value.product_id,
        quantity: hold.value.quantity,
      });
      const updated = await tx.holds.findUniqueOrThrow({
        where: { id: holdId },
        include: adminHoldInclude,
      });
      return ok({
        hold: mapAdminHoldRow(updated, releasedAt),
        message: "Hold released and reserved stock returned to availability.",
      });
    });
  } catch (error) {
    if (error instanceof OperationalStockError) return err(mapStockError(error, holdId));
    throw error;
  }
}

export async function convertHold(
  actor: StaffSession,
  holdId: string,
  input: ConvertHoldInput,
): Promise<Result<HoldActionSuccess, HoldActionError>> {
  return prisma.$transaction(async (tx) => {
    const hold = await findActiveHold(tx, holdId);
    if (!hold.ok) return hold;

    const convertedAt = new Date();
    const claimed = await tx.holds.updateMany({
      where: { id: holdId, status: "active", expires_at: { gt: convertedAt } },
      data: {
        status: "converted",
        converted_at: convertedAt,
        payment_progress: "pending",
      },
    });
    if (claimed.count !== 1) return holdChangedError(holdId);

    const variant = hold.value.variant_id
      ? hold.value.products.product_variants.find((entry) => entry.id === hold.value.variant_id)
      : undefined;
    const unitPrice = variant?.price ?? hold.value.products.price;
    const sku = variant?.sku ?? hold.value.products.sku;
    const total = unitPrice.mul(hold.value.quantity);
    const orderNumber = `LS-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    const order = await tx.orders.create({
      data: {
        order_number: orderNumber,
        customer_id: hold.value.customer_id,
        source: "hold-conversion",
        channel: orderChannelForHoldSource(hold.value.source),
        payment_status: "pending",
        payment_method: null,
        fulfilment_method: "delivery",
        fulfilment_status: "unfulfilled",
        customer_name: hold.value.customers.name,
        customer_email: hold.value.customers.email,
        delivery_name: hold.value.customers.name,
        delivery_phone: hold.value.customers.phone,
        delivery_city: input.deliveryCity,
        currency: "NGN",
        subtotal: total,
        total,
        notes: input.notes,
        attention: "payment",
        created_by_profile_id: actor.authUserId,
        order_lines: {
          create: {
            product_id: hold.value.product_id,
            ...(hold.value.variant_id ? { variant_id: hold.value.variant_id } : {}),
            product_name: hold.value.products.name,
            ...(variant?.label ? { variant_label: variant.label } : {}),
            ...(sku ? { sku } : {}),
            quantity: hold.value.quantity,
            unit_price: unitPrice,
            stock_state: "reserved",
          },
        },
        order_timeline_events: {
          create: {
            status: "pending-payment",
            actor_profile_id: actor.authUserId,
            note: "Order created from an active hold. Reserved stock remains pending payment.",
            metadata: { holdId },
          },
        },
      },
      include: adminOrderInclude,
    });

    const updated = await tx.holds.update({
      where: { id: holdId },
      data: { order_id: order.id },
      include: adminHoldInclude,
    });
    await tx.activity_events.create({
      data: {
        kind: "order",
        title: `${orderNumber} created from hold`,
        detail: `${hold.value.quantity} reserved unit${hold.value.quantity === 1 ? "" : "s"} · payment pending`,
        actor_profile_id: actor.authUserId,
        product_id: hold.value.product_id,
        order_id: order.id,
        customer_id: hold.value.customer_id,
      },
    });
    await recordHoldAudit(tx, actor, holdId, "hold.converted", {
      orderId: order.id,
      orderNumber,
    });

    return ok({
      hold: mapAdminHoldRow(updated, convertedAt),
      order: mapAdminOrderRow(order),
      message: `${orderNumber} created with payment still pending.`,
    });
  });
}

type ActiveHoldRow = Prisma.holdsGetPayload<{
  include: typeof adminHoldInclude;
}>;

async function findActiveHold(
  tx: Prisma.TransactionClient,
  holdId: string,
): Promise<Result<ActiveHoldRow, HoldActionError>> {
  const row = await tx.holds.findUnique({ where: { id: holdId }, include: adminHoldInclude });
  if (!row) {
    return err({ code: "hold-not-found", message: "The selected hold could not be found.", holdId });
  }
  const now = new Date();
  if (row.status !== "active" || row.expires_at <= now) {
    if (row.status === "active" && row.expires_at <= now) {
      await tx.holds.updateMany({
        where: { id: holdId, status: "active", expires_at: { lte: now } },
        data: { status: "expired" },
      });
    }
    return err({
      code: "hold-inactive",
      message: "This hold is no longer active and cannot be changed.",
      holdId,
    });
  }
  return ok(row);
}

function holdChangedError(holdId: string): Result<never, HoldActionError> {
  return err({
    code: "hold-inactive",
    message: "This hold changed while the action was being completed. Refresh and try again.",
    holdId,
  });
}

async function recordHoldAudit(
  tx: Prisma.TransactionClient,
  actor: StaffSession,
  holdId: string,
  action: string,
  metadata: Prisma.InputJsonValue,
) {
  await tx.audit_events.create({
    data: {
      actor_profile_id: actor.authUserId,
      action,
      target_table: "holds",
      target_id: holdId,
      metadata,
    },
  });
}

function orderChannelForHoldSource(source: string): SalesChannel {
  switch (source.replaceAll("_", "-")) {
    case "storefront":
      return "online";
    case "whatsapp":
      return "whatsapp";
    case "instagram":
      return "instagram";
    case "physical-store":
      return "physical-store";
    default:
      return "staff-assisted";
  }
}

function mapStockError(error: OperationalStockError, holdId: string): HoldActionError {
  return {
    code:
      error.code === "stock-write-conflict"
        ? "stock-write-conflict"
        : "insufficient-reserved-stock",
    message: error.message,
    holdId,
    ...(error.context.available === undefined ? {} : { available: error.context.available }),
    ...(error.context.requested === undefined ? {} : { requested: error.context.requested }),
  };
}
