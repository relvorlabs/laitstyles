import "server-only";

import { err, ok, type Result } from "@/lib/errors";
import { runSerializable } from "@/lib/prisma/serializable";
import { hasCapability } from "@/modules/auth/permissions";
import type { StaffSession } from "@/modules/auth/server/session";
import type {
  StockAdjustmentError,
  StockAdjustmentInput,
  StockAdjustmentOutcome,
} from "@/modules/inventory/types";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function adjustInventoryStock(
  actor: StaffSession,
  input: StockAdjustmentInput,
): Promise<Result<StockAdjustmentOutcome, StockAdjustmentError>> {
  if (!hasCapability(actor.role, "inventory:update")) {
    return err({
      code: "forbidden",
      message: "You don't have permission to adjust inventory.",
    });
  }

  const note = input.note.trim().replace(/\s+/g, " ");
  if (
    !uuidPattern.test(input.productId) ||
    (input.variantId !== null && !uuidPattern.test(input.variantId)) ||
    !Number.isInteger(input.quantityDelta) ||
    input.quantityDelta === 0 ||
    note.length < 3 ||
    note.length > 500
  ) {
    return err({
      code: "invalid-adjustment",
      message: "Provide a valid product, stock change and adjustment note.",
    });
  }

  return runSerializable(
    async (tx) => {
      const product = await tx.products.findUnique({
        where: { id: input.productId },
        select: {
          inventory_mode: true,
          product_variants: { select: { id: true } },
        },
      });
      if (!product) {
        return err({
          code: "product-not-found",
          message: "The selected product could not be found.",
        });
      }

      if (product.inventory_mode === "variant") {
        if (
          !input.variantId ||
          !product.product_variants.some((variant) => variant.id === input.variantId)
        ) {
          return err({
            code: "variant-not-found",
            message: "Choose a variant that belongs to this product.",
          });
        }
      } else if (input.variantId !== null) {
        return err({
          code: "variant-not-found",
          message: "This product stores stock at product level and does not accept a variant.",
        });
      }

      const stock = await tx.stock_levels.findFirst({
        where: { product_id: input.productId, variant_id: input.variantId },
      });
      if (!stock) {
        return err({
          code: "stock-level-not-found",
          message: "The selected product does not have a stock balance to adjust.",
        });
      }

      const nextTotal = stock.total_received + input.quantityDelta;
      if (
        nextTotal < 0 ||
        stock.available + input.quantityDelta < 0 ||
        (product.inventory_mode === "unique" && nextTotal > 1)
      ) {
        return err({
          code: "invalid-adjustment",
          message: "This adjustment would create an invalid stock balance.",
        });
      }

      const updated = await tx.stock_levels.updateMany({
        where: {
          id: stock.id,
          total_received: stock.total_received,
          available: stock.available,
        },
        data: {
          total_received: { increment: input.quantityDelta },
          available: { increment: input.quantityDelta },
        },
      });
      if (updated.count !== 1) {
        return err({
          code: "invalid-adjustment",
          message: "The stock balance changed while this adjustment was being applied. Try again.",
        });
      }

      const balance = await tx.stock_levels.findUniqueOrThrow({
        where: { id: stock.id },
      });
      const movement = await tx.stock_movements.create({
        data: {
          product_id: input.productId,
          variant_id: input.variantId,
          kind: "adjusted",
          quantity: input.quantityDelta,
          actor_profile_id: actor.authUserId,
          note,
          metadata: {
            previous_total_received: stock.total_received,
            next_total_received: balance.total_received,
            previous_available: stock.available,
            next_available: balance.available,
          },
        },
      });
      await tx.audit_events.create({
        data: {
          actor_profile_id: actor.authUserId,
          action: "inventory:update",
          target_table: "stock_levels",
          target_id: stock.id,
          metadata: {
            product_id: input.productId,
            variant_id: input.variantId,
            quantity_delta: input.quantityDelta,
            movement_id: movement.id,
          },
        },
      });

      return ok({
        balance: {
          totalReceived: balance.total_received,
          available: balance.available,
          reserved: balance.reserved,
          committed: balance.committed,
          sold: balance.sold,
          returned: balance.returned,
          damaged: balance.damaged,
        },
        movement: {
          id: movement.id,
          productId: movement.product_id,
          variantId: movement.variant_id,
          kind: "adjusted",
          quantity: movement.quantity,
          occurredAt: movement.occurred_at.toISOString(),
          actor: actor.displayName ?? actor.email ?? actor.authUserId,
          note: movement.note ?? "",
        },
      });
    },
  );
}
