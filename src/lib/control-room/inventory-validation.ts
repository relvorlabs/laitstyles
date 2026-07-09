import type {
  InventoryCounts,
  InventoryProduct,
  ProductReview,
  StockMovement,
} from "@/lib/control-room/inventory-types";
import { err, ok, type Result } from "@/lib/control-room/result";

export type InventoryValidationIssue = {
  path: string;
  code:
    | "negative-count"
    | "non-integer-count"
    | "stock-total-mismatch"
    | "unique-quantity"
    | "missing-cover"
    | "multiple-covers"
    | "empty-variants"
    | "duplicate-variant-id"
    | "duplicate-variant-sku"
    | "invalid-threshold"
    | "duplicate-product-id"
    | "duplicate-slug"
    | "duplicate-reference"
    | "orphan-stock-movement"
    | "orphan-stock-movement-variant"
    | "invalid-stock-movement-quantity"
    | "orphan-review";
  message: string;
};

export type InventoryDataset = {
  products: InventoryProduct[];
  stockMovements: StockMovement[];
  reviews: ProductReview[];
};

export function validateInventoryProduct(
  product: InventoryProduct,
): Result<InventoryProduct, InventoryValidationIssue[]> {
  const issues: InventoryValidationIssue[] = [];

  if (!Number.isInteger(product.lowStockThreshold) || product.lowStockThreshold < 0) {
    issues.push({
      path: "lowStockThreshold",
      code: "invalid-threshold",
      message: "Low-stock threshold must be a non-negative whole number.",
    });
  }

  const coverCount = product.media.filter((item) => item.kind === "cover").length;
  if (coverCount === 0) {
    issues.push({
      path: "media",
      code: "missing-cover",
      message: "Every product requires one cover image.",
    });
  } else if (coverCount > 1) {
    issues.push({
      path: "media",
      code: "multiple-covers",
      message: "A product can have only one cover image.",
    });
  }

  if (product.inventoryMode === "variant") {
    if (product.variants.length === 0) {
      issues.push({
        path: "variants",
        code: "empty-variants",
        message: "A variant product requires at least one variant.",
      });
    }

    const variantIds = new Set<string>();
    const variantSkus = new Set<string>();

    for (const [index, variant] of product.variants.entries()) {
      if (variantIds.has(variant.id)) {
        issues.push({
          path: `variants.${index}.id`,
          code: "duplicate-variant-id",
          message: `Variant id ${variant.id} is duplicated in this product.`,
        });
      }
      variantIds.add(variant.id);

      const normalizedSku = normalizeReference(variant.sku);
      if (variantSkus.has(normalizedSku)) {
        issues.push({
          path: `variants.${index}.sku`,
          code: "duplicate-variant-sku",
          message: `Variant SKU ${variant.sku} is duplicated in this product.`,
        });
      }
      variantSkus.add(normalizedSku);

      issues.push(...validateCounts(variant.stock, `variants.${index}.stock`));
    }
  } else {
    issues.push(...validateCounts(product.stock, "stock"));
  }

  if (product.inventoryMode === "unique") {
    const counts = product.stock;
    const buckets = [
      counts.available,
      counts.reserved,
      counts.sold,
      counts.returned,
      counts.damaged,
    ];

    if (counts.totalReceived !== 1 || buckets.some((value) => value > 1)) {
      issues.push({
        path: "stock",
        code: "unique-quantity",
        message: "A unique piece must represent exactly one physical unit.",
      });
    }
  }

  return issues.length ? err(issues) : ok(product);
}

export function validateInventoryDataset(
  dataset: InventoryDataset,
): Result<InventoryDataset, InventoryValidationIssue[]> {
  const issues: InventoryValidationIssue[] = [];
  const productIds = new Map<string, number>();
  const slugs = new Map<string, number>();
  const references = new Map<string, string>();
  const productById = new Map<string, InventoryProduct>();

  for (const [index, product] of dataset.products.entries()) {
    productById.set(product.id, product);
    collectDuplicate(
      productIds,
      product.id,
      index,
      "duplicate-product-id",
      `Product id ${product.id} is duplicated.`,
      `products.${index}.id`,
      issues,
    );
    collectDuplicate(
      slugs,
      product.slug,
      index,
      "duplicate-slug",
      `Product slug ${product.slug} is duplicated.`,
      `products.${index}.slug`,
      issues,
    );

    const productValidation = validateInventoryProduct(product);
    if (!productValidation.ok) {
      issues.push(
        ...productValidation.error.map((issue) => ({
          ...issue,
          path: `products.${index}.${issue.path}`,
        })),
      );
    }

    for (const reference of getSellableReferences(product)) {
      const normalized = normalizeReference(reference);
      const existingProduct = references.get(normalized);
      if (existingProduct) {
        issues.push({
          path: `products.${index}`,
          code: "duplicate-reference",
          message: `${reference} is already used by ${existingProduct}.`,
        });
      } else {
        references.set(normalized, product.name);
      }
    }
  }

  for (const [index, movement] of dataset.stockMovements.entries()) {
    const product = productById.get(movement.productId);
    if (!product) {
      issues.push({
        path: `stockMovements.${index}.productId`,
        code: "orphan-stock-movement",
        message: `Stock movement ${movement.id} references a missing product.`,
      });
      continue;
    }

    if (!Number.isInteger(movement.quantity) || movement.quantity <= 0) {
      issues.push({
        path: `stockMovements.${index}.quantity`,
        code: "invalid-stock-movement-quantity",
        message: "Stock movement quantity must be a positive whole number.",
      });
    }

    if (
      movement.variantId &&
      (product.inventoryMode !== "variant" ||
        !product.variants.some((variant) => variant.id === movement.variantId))
    ) {
      issues.push({
        path: `stockMovements.${index}.variantId`,
        code: "orphan-stock-movement-variant",
        message: `Stock movement ${movement.id} references a missing variant.`,
      });
    }
  }

  for (const [index, review] of dataset.reviews.entries()) {
    if (!productById.has(review.productId)) {
      issues.push({
        path: `reviews.${index}.productId`,
        code: "orphan-review",
        message: `Review ${review.id} references a missing product.`,
      });
    }
  }

  return issues.length ? err(issues) : ok(dataset);
}

function validateCounts(
  counts: InventoryCounts,
  path: string,
): InventoryValidationIssue[] {
  const issues: InventoryValidationIssue[] = [];
  const entries = Object.entries(counts) as Array<
    [keyof InventoryCounts, number]
  >;

  for (const [key, value] of entries) {
    if (!Number.isInteger(value)) {
      issues.push({
        path: `${path}.${key}`,
        code: "non-integer-count",
        message: `${key} must be a whole number.`,
      });
    }
    if (value < 0) {
      issues.push({
        path: `${path}.${key}`,
        code: "negative-count",
        message: `${key} cannot be negative.`,
      });
    }
  }

  const allocated =
    counts.available +
    counts.reserved +
    counts.sold +
    counts.returned +
    counts.damaged;

  if (allocated !== counts.totalReceived) {
    issues.push({
      path,
      code: "stock-total-mismatch",
      message:
        "Received stock must equal available, reserved, sold, returned and damaged units.",
    });
  }

  return issues;
}

function getSellableReferences(product: InventoryProduct) {
  if (product.inventoryMode === "unique") {
    return product.archiveNumber.toLowerCase() === "pending"
      ? []
      : [product.archiveNumber];
  }
  if (product.inventoryMode === "stocked") return [product.sku];
  return product.variants.map((variant) => variant.sku);
}

function normalizeReference(value: string) {
  return value.trim().toLocaleUpperCase("en-NG");
}

function collectDuplicate(
  values: Map<string, number>,
  value: string,
  index: number,
  code: Extract<
    InventoryValidationIssue["code"],
    "duplicate-product-id" | "duplicate-slug"
  >,
  message: string,
  path: string,
  issues: InventoryValidationIssue[],
) {
  const normalized = value.trim().toLocaleLowerCase("en-NG");
  if (values.has(normalized)) {
    issues.push({ path, code, message });
  } else {
    values.set(normalized, index);
  }
}
