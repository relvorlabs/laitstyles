import "server-only";

import type { Prisma } from "@/lib/prisma";

export type OperationalStockMutationKind =
  | "reserve"
  | "release-reserved"
  | "commit-available"
  | "commit-reserved"
  | "release-committed"
  | "sell-committed"
  | "return-sold"
  | "restock-returned"
  | "damage-returned";

export type OperationalStockFailureCode =
  | "product-not-found"
  | "variant-required"
  | "variant-not-found"
  | "variant-not-allowed"
  | "stock-level-not-found"
  | "invalid-quantity"
  | "insufficient-available-stock"
  | "insufficient-reserved-stock"
  | "insufficient-committed-stock"
  | "insufficient-sold-stock"
  | "insufficient-returned-stock"
  | "stock-write-conflict";

export class OperationalStockError extends Error {
  constructor(
    readonly code: OperationalStockFailureCode,
    message: string,
    readonly context: {
      productId: string;
      variantId?: string;
      requested?: number;
      available?: number;
    },
  ) {
    super(message);
    this.name = "OperationalStockError";
  }
}

export type OperationalStockMutationInput = {
  productId: string;
  variantId?: string;
  quantity: number;
  kind: OperationalStockMutationKind;
  actorProfileId: string;
  note: string;
  relatedOrderId?: string;
  relatedHoldId?: string;
  relatedReturnId?: string;
  metadata?: Prisma.InputJsonValue;
};

export async function applyOperationalStockMutation(
  tx: Prisma.TransactionClient,
  input: OperationalStockMutationInput,
): Promise<void> {
  if (!Number.isInteger(input.quantity) || input.quantity < 1) {
    throw new OperationalStockError(
      "invalid-quantity",
      "Stock quantities must be whole numbers greater than zero.",
      {
        productId: input.productId,
        ...(input.variantId ? { variantId: input.variantId } : {}),
        requested: input.quantity,
      },
    );
  }

  const target = await resolveStockTarget(tx, input.productId, input.variantId);
  const change = buildStockChange(target, input);
  const updated = await tx.stock_levels.updateMany({
    where: { id: target.id, ...change.expected },
    data: change.data,
  });

  if (updated.count !== 1) {
    throw new OperationalStockError(
      "stock-write-conflict",
      "Stock changed while this operation was being completed. Refresh and try again.",
      {
        productId: input.productId,
        ...(input.variantId ? { variantId: input.variantId } : {}),
        requested: input.quantity,
      },
    );
  }

  await tx.stock_movements.create({
    data: {
      product_id: input.productId,
      variant_id: target.variant_id,
      kind: movementKind(input.kind),
      quantity: input.quantity,
      actor_profile_id: input.actorProfileId,
      note: input.note,
      related_order_id: input.relatedOrderId,
      related_hold_id: input.relatedHoldId,
      related_return_id: input.relatedReturnId,
      metadata: input.metadata ?? {},
    },
  });
}

type StockTarget = {
  id: string;
  variant_id: string | null;
  available: number;
  reserved: number;
  committed: number;
  sold: number;
  returned: number;
  damaged: number;
};

async function resolveStockTarget(
  tx: Prisma.TransactionClient,
  productId: string,
  variantId: string | undefined,
): Promise<StockTarget> {
  const product = await tx.products.findUnique({
    where: { id: productId },
    select: {
      id: true,
      inventory_mode: true,
      product_variants: { select: { id: true } },
    },
  });

  if (!product) {
    throw new OperationalStockError(
      "product-not-found",
      "The selected product could not be found.",
      {
        productId,
        ...(variantId ? { variantId } : {}),
      },
    );
  }

  if (product.inventory_mode === "variant") {
    if (!variantId) {
      throw new OperationalStockError(
        "variant-required",
        "Choose the exact product variant before changing stock.",
        { productId },
      );
    }
    if (!product.product_variants.some((variant) => variant.id === variantId)) {
      throw new OperationalStockError(
        "variant-not-found",
        "The selected variant does not belong to this product.",
        { productId, variantId },
      );
    }
  } else if (variantId) {
    throw new OperationalStockError(
      "variant-not-allowed",
      "This product does not use variant-level stock.",
      { productId, variantId },
    );
  }

  const stock = await tx.stock_levels.findFirst({
    where: {
      product_id: productId,
      variant_id: product.inventory_mode === "variant" ? variantId : null,
    },
    select: {
      id: true,
      variant_id: true,
      available: true,
      reserved: true,
      committed: true,
      sold: true,
      returned: true,
      damaged: true,
    },
  });

  if (!stock) {
    throw new OperationalStockError(
      "stock-level-not-found",
      "No stock balance exists for the selected product.",
      { productId, ...(variantId ? { variantId } : {}) },
    );
  }
  return stock;
}

function buildStockChange(target: StockTarget, input: OperationalStockMutationInput) {
  const quantity = input.quantity;
  switch (input.kind) {
    case "reserve":
      assertEnough("available", target.available, input);
      return {
        expected: { available: target.available, reserved: target.reserved },
        data: { available: { decrement: quantity }, reserved: { increment: quantity } },
      };
    case "release-reserved":
      assertEnough("reserved", target.reserved, input);
      return {
        expected: { available: target.available, reserved: target.reserved },
        data: { reserved: { decrement: quantity }, available: { increment: quantity } },
      };
    case "commit-available":
      assertEnough("available", target.available, input);
      return {
        expected: { available: target.available, committed: target.committed },
        data: { available: { decrement: quantity }, committed: { increment: quantity } },
      };
    case "commit-reserved":
      assertEnough("reserved", target.reserved, input);
      return {
        expected: { reserved: target.reserved, committed: target.committed },
        data: { reserved: { decrement: quantity }, committed: { increment: quantity } },
      };
    case "release-committed":
      assertEnough("committed", target.committed, input);
      return {
        expected: { available: target.available, committed: target.committed },
        data: { committed: { decrement: quantity }, available: { increment: quantity } },
      };
    case "sell-committed":
      assertEnough("committed", target.committed, input);
      return {
        expected: { committed: target.committed, sold: target.sold },
        data: { committed: { decrement: quantity }, sold: { increment: quantity } },
      };
    case "return-sold":
      assertEnough("sold", target.sold, input);
      return {
        expected: { sold: target.sold, returned: target.returned },
        data: { sold: { decrement: quantity }, returned: { increment: quantity } },
      };
    case "restock-returned":
      assertEnough("returned", target.returned, input);
      return {
        expected: { available: target.available, returned: target.returned },
        data: { returned: { decrement: quantity }, available: { increment: quantity } },
      };
    case "damage-returned":
      assertEnough("returned", target.returned, input);
      return {
        expected: { returned: target.returned, damaged: target.damaged },
        data: { returned: { decrement: quantity }, damaged: { increment: quantity } },
      };
  }
}

function assertEnough(
  bucket: "available" | "reserved" | "committed" | "sold" | "returned",
  balance: number,
  input: OperationalStockMutationInput,
) {
  if (balance >= input.quantity) return;
  const code = `insufficient-${bucket}-stock` as OperationalStockFailureCode;
  throw new OperationalStockError(
    code,
    `Only ${balance} unit${balance === 1 ? " is" : "s are"} available in the ${bucket} stock bucket.`,
    {
      productId: input.productId,
      ...(input.variantId ? { variantId: input.variantId } : {}),
      requested: input.quantity,
      available: balance,
    },
  );
}

function movementKind(kind: OperationalStockMutationKind) {
  switch (kind) {
    case "reserve":
      return "reserved" as const;
    case "release-reserved":
      return "reservation_released" as const;
    case "commit-available":
    case "commit-reserved":
      return "committed" as const;
    case "release-committed":
      return "commitment_released" as const;
    case "sell-committed":
      return "sold" as const;
    case "return-sold":
      return "returned" as const;
    case "restock-returned":
      return "adjusted" as const;
    case "damage-returned":
      return "damaged" as const;
  }
}
