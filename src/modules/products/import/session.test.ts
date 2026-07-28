import { describe, expect, it } from "vitest";
import { createEmptyProductEditorValues } from "@/lib/admin/product-editor/product-editor-defaults";
import {
  hasUnsavedProductImportChanges,
  productImportSessionReducer,
} from "@/modules/products/import/session";
import type { ProductImportSessionState } from "@/modules/products/import/types";

const firstValues = { ...createEmptyProductEditorValues("stocked"), name: "First product" };
const secondValues = { ...createEmptyProductEditorValues("unique"), name: "Second product" };

function twoChildState(): ProductImportSessionState {
  return {
    source: "json",
    ignoredAssetCount: 0,
    selectedImportId: "child-1",
    children: [
      { importId: "child-1", values: firstValues, issues: [], status: "ready" },
      { importId: "child-2", values: secondValues, issues: [], status: "ready" },
    ],
  };
}

describe("productImportSessionReducer", () => {
  it("ignores selection IDs that are not part of the imported queue", () => {
    const state = twoChildState();
    expect(productImportSessionReducer(state, { type: "select", importId: "missing" })).toBe(state);
  });

  it("returns the same state when the editor reports unchanged values", () => {
    const state = twoChildState();
    expect(
      productImportSessionReducer(state, {
        type: "update-values",
        importId: "child-1",
        values: state.children[0]?.values ?? firstValues,
      }),
    ).toBe(state);
  });

  it("keeps a saved child saved when the editor reports the same reset values", () => {
    const state = twoChildState();
    const saved = {
      ...state,
      children: state.children.map((child, index) =>
        index === 0 ? { ...child, status: "saved" as const } : child,
      ),
    };
    const child = saved.children[0];
    if (!child) throw new Error("Expected the first imported child.");
    const values = child.values;
    expect(
      productImportSessionReducer(saved, {
        type: "update-values",
        importId: child.importId,
        values,
      }).children[0]?.status,
    ).toBe("saved");
  });
  it("keeps sibling edits isolated", () => {
    const state = twoChildState();

    const next = productImportSessionReducer(state, {
      type: "update-values",
      importId: "child-1",
      values: { ...firstValues, name: "Edited first product" },
    });

    expect(next.children[0]).toMatchObject({
      importId: "child-1",
      status: "ready",
      values: { name: "Edited first product" },
    });
    expect(next.children[1]).toEqual(state.children[1]);
  });

  it("moves selection only within the import queue bounds", () => {
    const state = twoChildState();

    const previousAtStart = productImportSessionReducer(state, {
      type: "select-previous",
    } as never);
    const next = productImportSessionReducer(state, { type: "select-next" } as never);
    const nextAtEnd = productImportSessionReducer(next, { type: "select-next" } as never);

    expect(previousAtStart.selectedImportId).toBe("child-1");
    expect(next.selectedImportId).toBe("child-2");
    expect(nextAtEnd.selectedImportId).toBe("child-2");
  });

  it("retains a failed child and keeps the session dirty until that child saves", () => {
    const state = twoChildState();

    const failed = productImportSessionReducer(state, {
      type: "set-status",
      importId: "child-1",
      status: "failed",
    });
    const saved = productImportSessionReducer(failed, {
      type: "set-status",
      importId: "child-1",
      status: "saved",
    });

    expect(failed.children).toHaveLength(2);
    expect(failed.children[0]).toMatchObject({ importId: "child-1", status: "failed" });
    expect(hasUnsavedProductImportChanges(failed)).toBe(true);
    expect(hasUnsavedProductImportChanges(saved)).toBe(true);
    expect(
      hasUnsavedProductImportChanges(
        productImportSessionReducer(saved, {
          type: "set-status",
          importId: "child-2",
          status: "saved",
        }),
      ),
    ).toBe(false);
  });

  it("marks a saved child as unsaved when its values change again", () => {
    const saved = productImportSessionReducer(twoChildState(), {
      type: "set-status",
      importId: "child-1",
      status: "saved",
    });

    const edited = productImportSessionReducer(saved, {
      type: "update-values",
      importId: "child-1",
      values: { ...firstValues, name: "Edited after saving" },
    });

    expect(edited.children[0]).toMatchObject({
      status: "ready",
      values: { name: "Edited after saving" },
    });
    expect(hasUnsavedProductImportChanges(edited)).toBe(true);
  });
});
