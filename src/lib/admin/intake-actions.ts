import { createProductEditorValues } from "@/lib/control-room/product-editor-defaults";
import { validateProductForPublish } from "@/lib/control-room/product-editor-schema";
import { replaceOrAppendProduct } from "@/lib/control-room/product-editor-state-utils";
import type {
  IntakeRecord,
  IntakeStage,
  IntakeTransitionSuccess,
  ProductEditorActionError,
  ProductEditorIntent,
} from "@/lib/control-room/product-editor-types";
import { err, ok, type Result } from "@/lib/control-room/result";
import type { ControlRoomState, InventoryProduct } from "@/lib/control-room/types";

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

export function applyIntakeTransition(
  state: ControlRoomState,
  productId: string,
  nextStage: IntakeStage,
  now: string,
  idFactory: (prefix: string) => string = createActionId,
): Result<IntakeStateResult, ProductEditorActionError> {
  const intake = createInitialIntakeRecords(state.products, state.intake, now, idFactory);
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
    const publishIssues = validateProductForPublish(createProductEditorValues(product));
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
      intake: intake.map((item) => (item.id === updatedRecord.id ? updatedRecord : item)),
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
  const records = new Map((existing ?? []).map((record) => [record.productId, record]));

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

export function updateIntakeAfterEditorAction(
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
          ? ("published" as const)
          : intent === "schedule"
            ? ("ready-to-publish" as const)
            : record.stage,
      updatedAt: now,
    };
  });
}

function inferIntakeStage(product: InventoryProduct): IntakeStage {
  if (!product.media.length) return "photographing";
  if (product.inventoryMode === "unique" && !product.measurements.length) {
    return "details-required";
  }
  if (!product.price) return "pricing-review";
  return "ready-to-publish";
}

function createActionId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}
