import type {
  ProductImportChild,
  ProductImportPersistence,
  ProductImportSessionState,
} from "@/modules/products/import/types";
import type { ProductEditorValues } from "@/modules/products/types";

export type ProductImportSessionAction =
  | { type: "select"; importId: string }
  | { type: "select-previous" }
  | { type: "select-next" }
  | { type: "append"; children: ProductImportChild[]; ignoredAssetCount: number }
  | { type: "toggle-selection"; importId: string }
  | { type: "select-all" }
  | { type: "clear-selection" }
  | { type: "remove"; importIds: string[] }
  | { type: "update-values"; importId: string; values: ProductEditorValues }
  | { type: "set-status"; importId: string; status: "ready" | "saving" | "saved" | "failed" }
  | {
      type: "set-persisted";
      importId: string;
      persistence: Exclude<ProductImportPersistence, null>;
    };

export function productImportSessionReducer(
  state: ProductImportSessionState,
  action: ProductImportSessionAction,
): ProductImportSessionState {
  if (action.type === "append") {
    return {
      ...state,
      children: [...state.children, ...action.children],
      ignoredAssetCount: state.ignoredAssetCount + action.ignoredAssetCount,
    };
  }
  if (action.type === "toggle-selection") {
    if (!state.children.some((child) => child.importId === action.importId)) return state;
    const selected = new Set(state.selectedImportIds);
    if (selected.has(action.importId)) selected.delete(action.importId);
    else selected.add(action.importId);
    return {
      ...state,
      selectedImportIds: state.children
        .filter((child) => selected.has(child.importId))
        .map((child) => child.importId),
    };
  }
  if (action.type === "select-all") {
    return { ...state, selectedImportIds: state.children.map((child) => child.importId) };
  }
  if (action.type === "clear-selection") {
    return { ...state, selectedImportIds: [] };
  }
  if (action.type === "remove") {
    return removeChildren(state, action.importIds);
  }
  if (action.type === "select") {
    return state.children.some((child) => child.importId === action.importId)
      ? { ...state, selectedImportId: action.importId }
      : state;
  }
  if (action.type === "select-previous" || action.type === "select-next") {
    const selectedIndex = state.children.findIndex(
      (child) => child.importId === state.selectedImportId,
    );
    const nextIndex = Math.min(
      state.children.length - 1,
      Math.max(0, selectedIndex + (action.type === "select-next" ? 1 : -1)),
    );
    return { ...state, selectedImportId: state.children[nextIndex]?.importId ?? null };
  }
  if (action.type === "update-values") {
    const current = state.children.find((child) => child.importId === action.importId);
    if (current && sameEditorValues(current.values, action.values)) return state;
  }
  if (action.type === "set-persisted") {
    return {
      ...state,
      children: state.children.map((child) =>
        child.importId === action.importId
          ? { ...child, status: "saved", isDirty: false, persistence: action.persistence }
          : child,
      ),
    };
  }
  return {
    ...state,
    children: state.children.map((child) =>
      child.importId !== action.importId
        ? child
        : action.type === "update-values"
          ? {
              ...child,
              values: action.values,
              isDirty: true,
              status:
                child.status === "saved" && !sameEditorValues(child.values, action.values)
                  ? "ready"
                  : child.status,
            }
          : {
              ...child,
              status: action.status,
              isDirty:
                action.status === "saved"
                  ? false
                  : action.status === "saving" || action.status === "failed"
                    ? true
                    : child.isDirty,
            },
    ),
  };
}

function sameEditorValues(left: ProductEditorValues, right: ProductEditorValues) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function hasUnsavedProductImportChanges(state: ProductImportSessionState) {
  return state.children.some((child) => child.isDirty);
}

export function editedProductImportCount(
  state: ProductImportSessionState,
  importIds: string[],
): number {
  const requested = new Set(importIds);
  return state.children.filter((child) => child.isDirty && requested.has(child.importId)).length;
}

function removeChildren(state: ProductImportSessionState, importIds: string[]) {
  const removed = new Set(importIds);
  const activeIndex = state.children.findIndex(
    (child) => child.importId === state.selectedImportId,
  );
  const children = state.children.filter((child) => !removed.has(child.importId));
  const selectedImportId = removed.has(state.selectedImportId ?? "")
    ? (children[Math.min(Math.max(activeIndex, 0), children.length - 1)]?.importId ?? null)
    : state.selectedImportId;
  return {
    ...state,
    children,
    selectedImportId,
    selectedImportIds: state.selectedImportIds.filter((id) => !removed.has(id)),
  };
}
