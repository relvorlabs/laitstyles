import { describe, expect, it } from "vitest";
import { createEmptyProductEditorValues } from "@/lib/admin/product-editor/product-editor-defaults";
import {
  editedProductImportCount,
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
    selectedImportIds: [],
    children: [
      {
        importId: "child-1",
        values: firstValues,
        issues: [],
        status: "ready",
        isDirty: false,
        persistence: null,
      },
      {
        importId: "child-2",
        values: secondValues,
        issues: [],
        status: "ready",
        isDirty: false,
        persistence: null,
      },
    ],
  };
}

function childAt(state: ProductImportSessionState, index: number) {
  const child = state.children[index];
  if (!child) throw new Error(`Expected imported child at index ${index}.`);
  return child;
}

describe("productImportSessionReducer", () => {
  it("appends accepted children, retains the active selection, and adds ignored assets", () => {
    const state = twoChildState();
    const appendedChild = { ...childAt(state, 0), importId: "child-3" };

    const next = productImportSessionReducer(state, {
      type: "append",
      children: [appendedChild],
      ignoredAssetCount: 2,
    });

    expect(next.children.map((child) => child.importId)).toEqual(["child-1", "child-2", "child-3"]);
    expect(next.selectedImportId).toBe("child-1");
    expect(next.selectedImportIds).toEqual([]);
    expect(next.ignoredAssetCount).toBe(2);
  });

  it("selects every queued child and clears only the selection", () => {
    const state = { ...twoChildState(), selectedImportIds: ["child-1"] };
    const selected = productImportSessionReducer(state, { type: "select-all" });
    const cleared = productImportSessionReducer(selected, { type: "clear-selection" });

    expect(selected.selectedImportIds).toEqual(["child-1", "child-2"]);
    expect(cleared.selectedImportIds).toEqual([]);
    expect(cleared.selectedImportId).toBe("child-1");
  });

  it("ignores unknown selection toggles and keeps selected IDs in queue order", () => {
    const state = twoChildState();
    const toggled = productImportSessionReducer(state, {
      type: "toggle-selection",
      importId: "child-2",
    });

    expect(
      productImportSessionReducer(toggled, { type: "toggle-selection", importId: "missing" }),
    ).toBe(toggled);
    expect(
      productImportSessionReducer(toggled, { type: "toggle-selection", importId: "child-1" })
        .selectedImportIds,
    ).toEqual(["child-1", "child-2"]);
  });

  it("selects the next surviving row when removing the active middle row", () => {
    const state = twoChildState();
    const middleState = {
      ...state,
      selectedImportId: "child-2",
      selectedImportIds: ["child-1", "child-2"],
      children: [...state.children, { ...childAt(state, 0), importId: "child-3" }],
    };

    const next = productImportSessionReducer(middleState, {
      type: "remove",
      importIds: ["child-2"],
    });

    expect(next.children.map((child) => child.importId)).toEqual(["child-1", "child-3"]);
    expect(next.selectedImportId).toBe("child-3");
    expect(next.selectedImportIds).toEqual(["child-1"]);
  });

  it("selects the previous final row and clears state when removal empties the queue", () => {
    const state = {
      ...twoChildState(),
      selectedImportId: "child-2",
      selectedImportIds: ["child-2"],
    };
    const afterFinalRemoval = productImportSessionReducer(state, {
      type: "remove",
      importIds: ["child-2"],
    });
    const empty = productImportSessionReducer(afterFinalRemoval, {
      type: "remove",
      importIds: ["child-1"],
    });

    expect(afterFinalRemoval.selectedImportId).toBe("child-1");
    expect(afterFinalRemoval.selectedImportIds).toEqual([]);
    expect(empty.children).toEqual([]);
    expect(empty.selectedImportId).toBeNull();
    expect(empty.selectedImportIds).toEqual([]);
  });

  it("counts only dirty children among the requested import IDs", () => {
    const state = {
      ...twoChildState(),
      children: [
        { ...childAt(twoChildState(), 0), isDirty: true },
        { ...childAt(twoChildState(), 1), isDirty: false },
      ],
    };

    expect(editedProductImportCount(state, ["child-1", "child-2", "missing"])).toBe(1);
    expect(editedProductImportCount(state, ["child-2"])).toBe(0);
  });

  it("does not warn when parsed children remain untouched", () => {
    expect(hasUnsavedProductImportChanges(twoChildState())).toBe(false);
  });

  it("tracks a saved child as dirty when it is edited and preserves its persistence intent", () => {
    const saved = productImportSessionReducer(twoChildState(), {
      type: "set-persisted",
      importId: "child-1",
      persistence: "draft",
    } as never);
    const edited = productImportSessionReducer(saved, {
      type: "update-values",
      importId: "child-1",
      values: { ...firstValues, name: "Edited after saving" },
    });

    expect(saved.children[0]).toMatchObject({ isDirty: false, persistence: "draft" });
    expect(edited.children[0]).toMatchObject({ isDirty: true, persistence: "draft" });
    expect(hasUnsavedProductImportChanges(edited)).toBe(true);
  });

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
    expect(hasUnsavedProductImportChanges(saved)).toBe(false);
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
