import { validateInventoryProduct } from "@/lib/admin/inventory/inventory-product-validation";
import type { InventoryProduct } from "@/lib/admin/inventory/inventory-types";
import type {
  InventoryDataset,
  InventoryValidationIssue,
} from "@/lib/admin/inventory/inventory-validation-types";
import { err, ok, type Result } from "@/lib/admin/result";

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

function getSellableReferences(product: InventoryProduct) {
  if (product.inventoryMode === "unique") {
    return product.archiveNumber.toLowerCase() === "pending" ? [] : [product.archiveNumber];
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
  code: Extract<InventoryValidationIssue["code"], "duplicate-product-id" | "duplicate-slug">,
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
