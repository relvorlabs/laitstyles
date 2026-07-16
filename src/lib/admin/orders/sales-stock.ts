import { validateInventoryProduct } from "@/lib/admin/inventory/inventory-product-validation";
import type { InventoryCounts, InventoryProduct } from "@/lib/admin/inventory/inventory-types";
import type { SalesActionError } from "@/lib/admin/orders/sales-types";
import { err, ok, type Result } from "@/lib/admin/result";

export type SalesStockMutationKind =
  | "reserve"
  | "release"
  | "sell-available"
  | "sell-reserved"
  | "restore-sold"
  | "return-sold"
  | "restock-returned"
  | "damage-returned";

export type SalesStockMutation = {
  productId: string;
  variantId?: string;
  quantity: number;
  kind: SalesStockMutationKind;
};

export type SalesStockMutationSuccess = {
  products: InventoryProduct[];
  product: InventoryProduct;
};

export function applySalesStockMutation(
  products: InventoryProduct[],
  mutation: SalesStockMutation,
): Result<SalesStockMutationSuccess, SalesActionError> {
  if (!Number.isInteger(mutation.quantity) || mutation.quantity < 1) {
    return err({
      code: "invalid-quantity",
      message: "Quantity must be a whole number greater than zero.",
      field: "quantity",
      productId: mutation.productId,
      variantId: mutation.variantId,
      requested: mutation.quantity,
    });
  }

  const product = products.find((item) => item.id === mutation.productId);
  if (!product) {
    return err({
      code: "product-not-found",
      message: "The selected product could not be found.",
      productId: mutation.productId,
    });
  }

  const updatedResult = updateProductStock(product, mutation);
  if (!updatedResult.ok) return updatedResult;

  const validation = validateInventoryProduct(updatedResult.value);
  if (!validation.ok) {
    return err({
      code: "invalid-quantity",
      message:
        validation.error[0]?.message ??
        "The stock change would create an invalid inventory balance.",
      productId: mutation.productId,
      variantId: mutation.variantId,
      requested: mutation.quantity,
    });
  }

  return ok({
    product: updatedResult.value,
    products: products.map((item) =>
      item.id === updatedResult.value.id ? updatedResult.value : item,
    ),
  });
}

export function applySalesStockMutations(
  products: InventoryProduct[],
  mutations: SalesStockMutation[],
): Result<InventoryProduct[], SalesActionError> {
  let nextProducts = products;

  for (const mutation of mutations) {
    const result = applySalesStockMutation(nextProducts, mutation);
    if (!result.ok) return result;
    nextProducts = result.value.products;
  }

  return ok(nextProducts);
}

function updateProductStock(
  product: InventoryProduct,
  mutation: SalesStockMutation,
): Result<InventoryProduct, SalesActionError> {
  if (product.inventoryMode === "variant") {
    if (!mutation.variantId) {
      return err({
        code: "variant-required",
        message: "Choose the exact product variant before changing stock.",
        productId: product.id,
        requested: mutation.quantity,
      });
    }

    const variant = product.variants.find((item) => item.id === mutation.variantId);
    if (!variant) {
      return err({
        code: "variant-not-found",
        message: "The selected product variant could not be found.",
        productId: product.id,
        variantId: mutation.variantId,
      });
    }

    const stockResult = mutateCounts(variant.stock, mutation);
    if (!stockResult.ok) return stockResult;

    return ok({
      ...product,
      variants: product.variants.map((item) =>
        item.id === variant.id ? { ...item, stock: stockResult.value } : item,
      ),
    });
  }

  if (mutation.variantId) {
    return err({
      code: "variant-not-allowed",
      message: "This product does not use variants.",
      productId: product.id,
      variantId: mutation.variantId,
    });
  }

  const stockResult = mutateCounts(product.stock, mutation);
  if (!stockResult.ok) return stockResult;
  return ok({ ...product, stock: stockResult.value });
}

function mutateCounts(
  counts: InventoryCounts,
  mutation: SalesStockMutation,
): Result<InventoryCounts, SalesActionError> {
  const quantity = mutation.quantity;

  switch (mutation.kind) {
    case "reserve":
      return moveStock(
        counts,
        "available",
        "reserved",
        quantity,
        "insufficient-available-stock",
        "There is not enough available stock for this hold or order.",
        mutation,
      );
    case "release":
      return moveStock(
        counts,
        "reserved",
        "available",
        quantity,
        "insufficient-reserved-stock",
        "The reserved stock is lower than the quantity being released.",
        mutation,
      );
    case "sell-available":
      return moveStock(
        counts,
        "available",
        "sold",
        quantity,
        "insufficient-available-stock",
        "There is not enough available stock to record this sale.",
        mutation,
      );
    case "sell-reserved":
      return moveStock(
        counts,
        "reserved",
        "sold",
        quantity,
        "insufficient-reserved-stock",
        "The order does not have enough reserved stock to confirm this sale.",
        mutation,
      );
    case "restore-sold":
      return moveStock(
        counts,
        "sold",
        "available",
        quantity,
        "insufficient-sold-stock",
        "The sold stock is lower than the quantity being restored.",
        mutation,
      );
    case "return-sold":
      return moveStock(
        counts,
        "sold",
        "returned",
        quantity,
        "insufficient-sold-stock",
        "The return quantity is higher than the sold stock for this product.",
        mutation,
      );
    case "restock-returned":
      return moveStock(
        counts,
        "returned",
        "available",
        quantity,
        "insufficient-returned-stock",
        "The returned stock is lower than the quantity being restocked.",
        mutation,
      );
    case "damage-returned":
      return moveStock(
        counts,
        "returned",
        "damaged",
        quantity,
        "insufficient-returned-stock",
        "The returned stock is lower than the quantity marked as damaged.",
        mutation,
      );
  }
}

function moveStock(
  counts: InventoryCounts,
  from: keyof InventoryCounts,
  to: keyof InventoryCounts,
  quantity: number,
  code: SalesActionError["code"],
  message: string,
  mutation: SalesStockMutation,
): Result<InventoryCounts, SalesActionError> {
  if (counts[from] < quantity) {
    return err({
      code,
      message,
      productId: mutation.productId,
      variantId: mutation.variantId,
      available: counts[from],
      requested: quantity,
    });
  }

  return ok({
    ...counts,
    [from]: counts[from] - quantity,
    [to]: counts[to] + quantity,
  });
}
