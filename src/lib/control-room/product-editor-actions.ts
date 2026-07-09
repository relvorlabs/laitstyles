import type {
  ControlRoomState,
  InventoryProduct,
  StockMovement,
} from "@/lib/control-room/types";
import { createProductEditorValues } from "@/lib/control-room/product-editor-defaults";
import { convertEditorValuesToProduct } from "@/lib/control-room/product-editor-conversion";
import {
  productEditorDraftSchema,
  validateProductForPublish,
  validateProductForSchedule,
} from "@/lib/control-room/product-editor-schema";
import type {
  IntakeRecord,
  IntakeStage,
  IntakeTransitionSuccess,
  ProductEditorActionError,
  ProductEditorActionSuccess,
  ProductEditorIntent,
  ProductEditorValues,
} from "@/lib/control-room/product-editor-types";
import { err, ok, type Result } from "@/lib/control-room/result";

export type ProductEditorStateResult = {
  state: ControlRoomState;
  action: ProductEditorActionSuccess;
};

export type IntakeStateResult = {
  state: ControlRoomState;
  action: IntakeTransitionSuccess;
};

const intakeStages: IntakeStage[] = [
  "received",
  "photographing",
  "details-required",
  "pricing-review",
  "ready-to-publish",
  "published",
];

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
      message:
        intent === "draft"
          ? "The draft could not be saved."
          : "Resolve the blocking product requirements before publishing.",
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

export function applyIntakeTransition(
  state: ControlRoomState,
  productId: string,
  nextStage: IntakeStage,
  now: string,
  idFactory: (prefix: string) => string = createActionId,
): Result<IntakeStateResult, ProductEditorActionError> {
  const intake = createInitialIntakeRecords(
    state.products,
    state.intake,
    now,
    idFactory,
  );
  const record = intake.find((item) => item.productId === productId);
  if (!record) {
    return err({
      code: "intake-not-found",
      message: "This product is not in the Intake workflow.",
    });
  }

  const currentIndex = intakeStages.indexOf(record.stage);
  const nextIndex = intakeStages.indexOf(nextStage);
  if (nextIndex < 0 || Math.abs(nextIndex - currentIndex) !== 1) {
    return err({
      code: "invalid-intake-transition",
      message: "Move Intake products one stage at a time.",
    });
  }

  const product = state.products.find((item) => item.id === productId);
  if (!product) {
    return err({
      code: "product-not-found",
      message: "The Intake product record could not be found.",
    });
  }

  if (nextStage === "published") {
    const publishIssues = validateProductForPublish(
      createProductEditorValues(product),
    );
    if (publishIssues.length) {
      return err({
        code: "validation-failed",
        message: "Complete the blocking product details before publishing.",
        issues: publishIssues,
      });
    }
  }

  const updatedRecord: IntakeRecord = {
    ...record,
    stage: nextStage,
    updatedAt: now,
  };
  const updatedProduct: InventoryProduct = {
    ...product,
    lifecycle: nextStage === "published" ? "active" : "intake",
    publication: nextStage === "published" ? "published" : "unpublished",
    updatedAt: now,
  };
  const message = `${product.name} moved to ${formatIntakeStage(nextStage)}.`;

  return ok({
    state: {
      ...state,
      asOf: now,
      products: replaceOrAppendProduct(state.products, updatedProduct),
      intake: intake.map((item) =>
        item.id === updatedRecord.id ? updatedRecord : item,
      ),
      activities: [
        {
          id: idFactory("activity"),
          kind: "inventory",
          title: message,
          detail: "The same catalogue record remains connected to its Intake history.",
          occurredAt: now,
          productId,
        },
        ...state.activities,
      ],
    },
    action: {
      record: updatedRecord,
      product: updatedProduct,
      message,
    },
  });
}

export function createInitialIntakeRecords(
  products: InventoryProduct[],
  existing: IntakeRecord[] | undefined,
  now: string,
  idFactory: (prefix: string) => string = createActionId,
): IntakeRecord[] {
  const records = new Map(
    (existing ?? []).map((record) => [record.productId, record]),
  );

  for (const product of products) {
    if (product.lifecycle !== "intake" || records.has(product.id)) continue;

    records.set(product.id, {
      id: idFactory("intake"),
      productId: product.id,
      stage: inferIntakeStage(product),
      receivedAt: product.createdAt,
      updatedAt: product.updatedAt || now,
      assignedTo: "Store owner",
      note: "Derived from the existing Intake product record.",
    });
  }

  return [...records.values()];
}

export function getAdjacentIntakeStages(stage: IntakeStage) {
  const index = intakeStages.indexOf(stage);
  return {
    previous: index > 0 ? intakeStages[index - 1] : null,
    next: index < intakeStages.length - 1 ? intakeStages[index + 1] : null,
  };
}

export function formatIntakeStage(stage: IntakeStage) {
  return stage.replaceAll("-", " ");
}

function inferIntakeStage(product: InventoryProduct): IntakeStage {
  if (!product.media.length) return "photographing";
  if (product.inventoryMode === "unique" && !product.measurements.length) {
    return "details-required";
  }
  if (!product.price) return "pricing-review";
  return "ready-to-publish";
}

function updateIntakeAfterEditorAction(
  intake: IntakeRecord[],
  product: InventoryProduct,
  intent: ProductEditorIntent,
  now: string,
) {
  return intake.map((record) => {
    if (record.productId !== product.id) return record;

    return {
      ...record,
      stage:
        intent === "publish"
          ? "published"
          : intent === "schedule"
            ? "ready-to-publish"
            : record.stage,
      updatedAt: now,
    };
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
      ? product.variants.reduce(
          (total, variant) => total + variant.stock.totalReceived,
          0,
        )
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

function findDuplicateReference(
  products: InventoryProduct[],
  values: ProductEditorValues,
) {
  const requested = getRequestedReferences(values);
  const existing = new Map<string, string>();

  for (const product of products) {
    if (product.id === values.productId) continue;
    for (const reference of getProductReferences(product)) {
      existing.set(normalizeReference(reference), product.name);
    }
  }

  return requested.find((reference) => existing.has(normalizeReference(reference)));
}

function getRequestedReferences(values: ProductEditorValues) {
  if (values.inventoryMode === "variant") {
    return values.variant.variants
      .map((variant) => variant.sku.trim())
      .filter(Boolean);
  }
  return values.internalReference.trim() ? [values.internalReference.trim()] : [];
}

function getProductReferences(product: InventoryProduct) {
  if (product.inventoryMode === "unique") return [product.archiveNumber];
  if (product.inventoryMode === "stocked") return [product.sku];
  return product.variants.map((variant) => variant.sku);
}

function replaceOrAppendProduct(
  products: InventoryProduct[],
  product: InventoryProduct,
) {
  const index = products.findIndex((item) => item.id === product.id);
  if (index < 0) return [product, ...products];

  return products.map((item) => (item.id === product.id ? product : item));
}

function normalizeReference(reference: string) {
  return reference.trim().toLocaleUpperCase("en-NG");
}

function getEditorSuccessMessage(
  product: InventoryProduct,
  intent: ProductEditorIntent,
) {
  if (intent === "draft") return `${product.name} saved as a draft.`;
  if (intent === "schedule") return `${product.name} scheduled for publication.`;
  return `${product.name} published.`;
}

function createActionId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}
