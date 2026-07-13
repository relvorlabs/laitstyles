import { describe, expect, it } from "vitest";
import {
  applyIntakeTransition,
  applyProductEditorAction,
  createInitialIntakeRecords,
} from "@/lib/control-room/product-editor-actions";
import {
  changeProductEditorMode,
  createEmptyProductEditorValues,
  createProductEditorValues,
} from "@/lib/control-room/product-editor-defaults";
import {
  validateProductEditorStep,
  validateProductForPublish,
} from "@/lib/control-room/product-editor-schema";
import { activeControlRoomSeed } from "@/lib/control-room/seed";
import type { ControlRoomState, ProductEditorValues } from "@/lib/control-room/types";

const now = "2026-07-09T14:00:00+01:00";

function idFactory() {
  let index = 0;
  return (prefix: string) => `${prefix}-test-${++index}`;
}

function createValidStockedValues(): ProductEditorValues {
  const values = createEmptyProductEditorValues("stocked");
  if (values.inventoryMode !== "stocked") {
    throw new Error("Expected stocked editor values");
  }

  return {
    ...values,
    name: "Botanical Studio Shirt",
    category: "Shirts",
    brand: "Laitstyle Studio",
    description: "A softly structured botanical shirt prepared for the daily studio collection.",
    collection: "Daily Form",
    internalReference: "LS-BSS-GRN",
    media: [
      {
        id: "media-test-cover",
        url: "/product-placeholder.svg",
        alt: "Botanical Studio Shirt front view",
        kind: "cover",
        position: 0,
        source: "url",
      },
    ],
    sellingPrice: 24500,
    referencePrice: 30000,
    cost: 9800,
    lowStockThreshold: 4,
    channels: ["storefront", "physical-store"],
    fulfilment: {
      weightKg: 0.6,
      pickupAvailable: true,
      deliveryRestrictions: "",
      packagingNotes: "Fold with tissue and use a medium mailer.",
    },
    stocked: {
      sizeLabel: "Relaxed fit",
      colour: "Sage",
      quantity: 50,
    },
  };
}

describe("product editor validation", () => {
  it("clears irrelevant branch values when the product mode changes", () => {
    const unique = createEmptyProductEditorValues("unique");
    if (unique.inventoryMode !== "unique") throw new Error("Expected unique");
    unique.name = "Shared identity";
    unique.unique.size = "M";

    const stocked = changeProductEditorMode(unique, "stocked");
    if (stocked.inventoryMode !== "stocked") {
      throw new Error("Expected stocked editor values after switching mode");
    }

    expect(stocked.inventoryMode).toBe("stocked");
    expect(stocked.name).toBe("Shared identity");
    expect("unique" in stocked).toBe(false);
    expect(stocked.stocked).toEqual({
      sizeLabel: "",
      colour: "",
      quantity: 1,
    });
  });

  it("returns step-local field errors for an incomplete product", () => {
    const values = createEmptyProductEditorValues("unique");

    expect(validateProductEditorStep(values, "identity")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "name", step: "identity" }),
        expect.objectContaining({
          path: "internalReference",
          step: "identity",
        }),
      ]),
    );
    expect(validateProductEditorStep(values, "images")).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: "media", step: "images" })]),
    );
    expect(validateProductForPublish(values).length).toBeGreaterThan(4);
  });
});

describe("product editor actions", () => {
  it("saves an incomplete draft without pretending to publish it", () => {
    const values = createEmptyProductEditorValues("unique");
    const result = applyProductEditorAction(
      activeControlRoomSeed,
      values,
      "draft",
      now,
      idFactory(),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.action.product.lifecycle).toBe("draft");
    expect(result.value.action.product.publication).toBe("unpublished");
    expect(result.value.action.product.image).toBe("/product-placeholder.svg");
    expect(result.value.state.stockMovements).toHaveLength(
      activeControlRoomSeed.stockMovements.length,
    );
  });

  it("publishes a valid stocked product through one state boundary", () => {
    const result = applyProductEditorAction(
      activeControlRoomSeed,
      createValidStockedValues(),
      "publish",
      now,
      idFactory(),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const product = result.value.action.product;
    expect(product.inventoryMode).toBe("stocked");
    if (product.inventoryMode !== "stocked") return;
    expect(product.stock).toEqual({
      totalReceived: 50,
      available: 50,
      reserved: 0,
      sold: 0,
      returned: 0,
      damaged: 0,
    });
    expect(product.publication).toBe("published");
    expect(result.value.state.products[0]?.id).toBe(product.id);
    expect(result.value.state.stockMovements[0]).toEqual(
      expect.objectContaining({
        productId: product.id,
        kind: "received",
        quantity: 50,
      }),
    );
  });

  it("rejects a reference already used by another product", () => {
    const values = createValidStockedValues();
    if (values.inventoryMode !== "stocked") throw new Error("Expected stocked");
    values.internalReference = "LS-CAN-TOTE";

    const result = applyProductEditorAction(
      activeControlRoomSeed,
      values,
      "publish",
      now,
      idFactory(),
    );

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({ code: "duplicate-reference" }),
      }),
    );
  });

  it("keeps an Intake product in Intake when its edits are saved", () => {
    const product = activeControlRoomSeed.products.find((item) => item.id === "ivory-wrap-skirt");
    if (!product) throw new Error("Missing Intake fixture");

    const result = applyProductEditorAction(
      activeControlRoomSeed,
      createProductEditorValues(product),
      "draft",
      now,
      idFactory(),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.action.product.lifecycle).toBe("intake");
    expect(result.value.state.products.filter((item) => item.id === product.id)).toHaveLength(1);
  });
});

describe("Intake transitions", () => {
  it("derives a details-required stage for the current Intake skirt", () => {
    const records = createInitialIntakeRecords(
      activeControlRoomSeed.products,
      undefined,
      now,
      idFactory(),
    );

    expect(records).toEqual([
      expect.objectContaining({
        productId: "ivory-wrap-skirt",
        stage: "details-required",
      }),
    ]);
  });

  it("moves one product record through adjacent stages without duplication", () => {
    const initialState: ControlRoomState = {
      ...activeControlRoomSeed,
      intake: createInitialIntakeRecords(
        activeControlRoomSeed.products,
        undefined,
        now,
        idFactory(),
      ),
    };
    const beforeCount = initialState.products.length;
    const result = applyIntakeTransition(
      initialState,
      "ivory-wrap-skirt",
      "pricing-review",
      now,
      idFactory(),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.state.products).toHaveLength(beforeCount);
    expect(result.value.action.record.stage).toBe("pricing-review");
    expect(result.value.action.product.lifecycle).toBe("intake");
  });

  it("rejects skipping Intake stages", () => {
    const state: ControlRoomState = {
      ...activeControlRoomSeed,
      intake: createInitialIntakeRecords(
        activeControlRoomSeed.products,
        undefined,
        now,
        idFactory(),
      ),
    };

    const result = applyIntakeTransition(state, "ivory-wrap-skirt", "published", now, idFactory());

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.objectContaining({ code: "invalid-intake-transition" }),
      }),
    );
  });
});
