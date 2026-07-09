import type {
  InventoryCounts,
  InventoryProduct,
} from "@/lib/control-room/inventory-types";
import type { InventoryValidationIssue } from "@/lib/control-room/inventory-validation-types";
import { err, ok, type Result } from "@/lib/control-room/result";

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

function normalizeReference(value: string) {
  return value.trim().toLocaleUpperCase("en-NG");
}
