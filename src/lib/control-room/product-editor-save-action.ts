import {
  createInitialIntakeRecords,
  updateIntakeAfterEditorAction,
} from "@/lib/control-room/intake-actions";
import { convertEditorValuesToProduct } from "@/lib/control-room/product-editor-conversion";
import {
  productEditorDraftSchema,
  validateProductForPublish,
  validateProductForSchedule,
} from "@/lib/control-room/product-editor-schema";
import {
  getProductReferences,
  normalizeProductReference,
  replaceOrAppendProduct,
} from "@/lib/control-room/product-editor-state-utils";
import { validateCommittedStockEdit } from "@/lib/control-room/product-editor-stock-guard";
import type {
  ProductEditorActionError,
  ProductEditorActionSuccess,
  ProductEditorIntent,
  ProductEditorValues,
} from "@/lib/control-room/product-editor-types";
import { err, ok, type Result } from "@/lib/control-room/result";
import type { ControlRoomState, InventoryProduct, StockMovement } from "@/lib/control-room/types";

export type ProductEditorStateResult = {
  state: ControlRoomState;
  action: ProductEditorActionSuccess;
};

export function applyProductEditorAction(
  state: ControlRoomState,
  values: ProductEditorValues,
  intent: ProductEditorIntent,
  now: string,
  idFactory: (prefix: string) => string = createActionId,
): Result<ProductEditorStateResult, ProductEditorActionError> {
  const draftResult = productEditorDraftSchema.safeParse(values);
  if (!draftResult.success) {
    return err({
      code: "validation-failed",
      message: "The product draft contains invalid field values.",
      issues: draftResult.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
        step: "review" as const,
      })),
    });
  }

  const issues =
    intent === "draft"
      ? []
      : intent === "schedule"
        ? validateProductForSchedule(values)
        : validateProductForPublish(values);

  if (issues.length) {
    return err({
      code: "validation-failed",
      message: "Resolve the blocking product requirements before publishing.",
      issues,
    });
  }

  const duplicateReference = findDuplicateReference(state.products, values);
  if (duplicateReference) {
    return err({
      code: "duplicate-reference",
      message: `${duplicateReference} is already used by another product.`,
      issues: [
        {
          path: "internalReference",
          message: "Use a unique archive number or SKU.",
          step: "identity",
        },
      ],
    });
  }

  const existingProduct = values.productId
    ? state.products.find((product) => product.id === values.productId)
    : undefined;

  if (values.productId && !existingProduct) {
    return err({
      code: "product-not-found",
      message: "This product is no longer available in the current session.",
    });
  }

  const committedStockIssues = validateCommittedStockEdit(existingProduct, values);
  if (committedStockIssues.length) {
    return err({
      code: "validation-failed",
      message:
        "Received stock cannot be lower than units already reserved, sold, returned or damaged.",
      issues: committedStockIssues,
    });
  }

  const product = convertEditorValuesToProduct(values, {
    intent,
    now,
    idFactory,
    existingProduct,
  });
  const products = replaceOrAppendProduct(state.products, product);
  const intake = updateIntakeAfterEditorAction(
    createInitialIntakeRecords(state.products, state.intake, now, idFactory),
    product,
    intent,
    now,
  );
  const stockMovement = createInitialStockMovement(
    existingProduct,
    product,
    intent,
    now,
    idFactory,
  );
  const message = getEditorSuccessMessage(product, intent);

  return ok({
    state: {
      ...state,
      asOf: now,
      products,
      intake,
      stockMovements: stockMovement
        ? [stockMovement, ...state.stockMovements]
        : state.stockMovements,
      activities: [
        {
          id: idFactory("activity"),
          kind: intent === "draft" ? "draft" : "inventory",
          title: message,
          detail:
            intent === "draft"
              ? "Saved in this browser session only."
              : intent === "schedule"
                ? `Scheduled for ${values.scheduledAt}.`
                : "Catalogue and stock views now use this product record.",
          occurredAt: now,
          productId: product.id,
        },
        ...state.activities,
      ],
    },
    action: {
      product,
      intent,
      message,
    },
  });
}

function createInitialStockMovement(
  existingProduct: InventoryProduct | undefined,
  product: InventoryProduct,
  intent: ProductEditorIntent,
  now: string,
  idFactory: (prefix: string) => string,
): StockMovement | null {
  if (existingProduct || intent === "draft") return null;

  const quantity =
    product.inventoryMode === "variant"
      ? product.variants.reduce((total, variant) => total + variant.stock.totalReceived, 0)
      : product.stock.totalReceived;

  return {
    id: idFactory("movement"),
    productId: product.id,
    variantId: null,
    kind: "received",
    quantity,
    occurredAt: now,
    actor: "Store owner",
    note: "Initial stock recorded through the product editor.",
  };
}

function findDuplicateReference(products: InventoryProduct[], values: ProductEditorValues) {
  const requested = getRequestedReferences(values);
  const existing = new Map<string, string>();

  for (const product of products) {
    if (product.id === values.productId) continue;
    for (const reference of getProductReferences(product)) {
      existing.set(normalizeProductReference(reference), product.name);
    }
  }

  return requested.find((reference) => existing.has(normalizeProductReference(reference)));
}

function getRequestedReferences(values: ProductEditorValues) {
  if (values.inventoryMode === "variant") {
    return values.variant.variants.map((variant) => variant.sku.trim()).filter(Boolean);
  }
  return values.internalReference.trim() ? [values.internalReference.trim()] : [];
}

function getEditorSuccessMessage(product: InventoryProduct, intent: ProductEditorIntent) {
  if (intent === "draft") return `${product.name} saved as a draft.`;
  if (intent === "schedule") {
    return `${product.name} scheduled for publication.`;
  }
  return `${product.name} published.`;
}

function createActionId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}
