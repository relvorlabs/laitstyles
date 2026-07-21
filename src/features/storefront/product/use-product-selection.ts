"use client";

import { useCallback, useMemo, useReducer } from "react";

import type { ProductDetail } from "@/lib/storefront/types";
import {
  createProductSelection,
  type ProductSelectionEvent,
  type ProductSelectionState,
  type ResolvedProductSelection,
  resolveProductSelection,
  transitionProductSelection,
} from "./product-selection";

export interface UseProductSelection extends ResolvedProductSelection {
  selectColour: (colour: string) => void;
  selectSize: (size: string) => void;
  setQuantity: (quantity: number) => void;
}

/**
 * React binding for the pure product-selection reducer. Seeds the canonical
 * first-render model (colour with stock, unambiguous size) and resolves colour →
 * compatible sizes → variant → media → price on every transition.
 */
export function useProductSelection(detail: ProductDetail): UseProductSelection {
  const [state, dispatch] = useReducer(
    (current: ProductSelectionState, event: ProductSelectionEvent) =>
      transitionProductSelection(detail, current, event),
    detail,
    createProductSelection,
  );

  const resolved = useMemo(() => resolveProductSelection(detail, state), [detail, state]);

  const selectColour = useCallback(
    (colour: string) => dispatch({ type: "select_colour", colour }),
    [],
  );
  const selectSize = useCallback((size: string) => dispatch({ type: "select_size", size }), []);
  const setQuantity = useCallback(
    (quantity: number) => dispatch({ type: "set_quantity", quantity }),
    [],
  );

  return { ...resolved, selectColour, selectSize, setQuantity };
}
