import type { InventoryProduct } from "@/lib/admin/inventory-types";
import type { ProductEditorIssue, ProductEditorValues } from "@/lib/admin/product-editor-types";

export function validateCommittedStockEdit(
  existingProduct: InventoryProduct | undefined,
  values: ProductEditorValues,
): ProductEditorIssue[] {
  if (!existingProduct) return [];

  const totalCommitted = getProductCommittedQuantity(existingProduct);
  if (existingProduct.inventoryMode !== values.inventoryMode && totalCommitted > 0) {
    return [
      {
        path: "inventoryMode",
        message:
          "Product type cannot change after units have been reserved, sold, returned or damaged.",
        step: "type",
      },
    ];
  }

  if (existingProduct.inventoryMode === "stocked" && values.inventoryMode === "stocked") {
    const committed = getCommittedQuantity(existingProduct.stock);
    return values.stocked.quantity < committed
      ? [
          {
            path: "stocked.quantity",
            message: `Total received cannot be lower than ${committed}, because those units are already committed.`,
            step: "stock",
          },
        ]
      : [];
  }

  if (existingProduct.inventoryMode === "unique" && values.inventoryMode === "unique") {
    const committed = getCommittedQuantity(existingProduct.stock);
    return committed > 1
      ? [
          {
            path: "unique",
            message:
              "This unique-piece record contains impossible committed stock and must be corrected before editing.",
            step: "stock",
          },
        ]
      : [];
  }

  if (existingProduct.inventoryMode === "variant" && values.inventoryMode === "variant") {
    const editorVariantById = new Map(
      values.variant.variants.map((variant, index) => [variant.id, { variant, index }]),
    );
    const issues: ProductEditorIssue[] = [];

    for (const existingVariant of existingProduct.variants) {
      const committed = getCommittedQuantity(existingVariant.stock);
      if (committed === 0) continue;

      const editorEntry = editorVariantById.get(existingVariant.id);
      if (!editorEntry) {
        issues.push({
          path: "variant.variants",
          message: `${existingVariant.label} cannot be removed because ${committed} unit${committed === 1 ? " is" : "s are"} already committed.`,
          step: "stock",
        });
        continue;
      }

      if (editorEntry.variant.quantity < committed) {
        issues.push({
          path: `variant.variants.${editorEntry.index}.quantity`,
          message: `Total received cannot be lower than ${committed} for ${existingVariant.label}.`,
          step: "stock",
        });
      }
    }

    return issues;
  }

  return [];
}

function getProductCommittedQuantity(product: InventoryProduct) {
  if (product.inventoryMode === "variant") {
    return product.variants.reduce(
      (total, variant) => total + getCommittedQuantity(variant.stock),
      0,
    );
  }

  return getCommittedQuantity(product.stock);
}

function getCommittedQuantity(stock: {
  reserved: number;
  sold: number;
  returned: number;
  damaged: number;
}) {
  return stock.reserved + stock.sold + stock.returned + stock.damaged;
}
