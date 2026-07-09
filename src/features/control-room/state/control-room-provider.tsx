"use client";

import {
  createContext,
  use,
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  applyIntakeTransition,
  applyProductEditorAction,
  createInitialIntakeRecords,
} from "@/lib/control-room/product-editor-actions";
import type {
  ControlRoomState,
  IntakeStage,
  IntakeTransitionSuccess,
  ProductEditorActionError,
  ProductEditorActionSuccess,
  ProductEditorIntent,
  ProductEditorValues,
} from "@/lib/control-room/types";
import type { Result } from "@/lib/control-room/result";

type ProductActionResult = Result<
  ProductEditorActionSuccess,
  ProductEditorActionError
>;

type IntakeActionResult = Result<
  IntakeTransitionSuccess,
  ProductEditorActionError
>;

type ControlRoomContextValue = {
  state: ControlRoomState;
  saveProduct: (
    values: ProductEditorValues,
    intent: ProductEditorIntent,
  ) => ProductActionResult;
  transitionIntake: (
    productId: string,
    nextStage: IntakeStage,
  ) => IntakeActionResult;
  resetPrototypeState: () => void;
};

const ControlRoomContext = createContext<ControlRoomContextValue | null>(null);

export function ControlRoomProvider({
  children,
  initialState,
}: {
  children: ReactNode;
  initialState: ControlRoomState;
}) {
  const [normalizedInitialState] = useState(() => normalizeState(initialState));
  const [state, setState] = useState(normalizedInitialState);
  const stateRef = useRef(normalizedInitialState);

  const commit = useCallback((nextState: ControlRoomState) => {
    stateRef.current = nextState;
    setState(nextState);
  }, []);

  const saveProduct = useCallback(
    (
      values: ProductEditorValues,
      intent: ProductEditorIntent,
    ): ProductActionResult => {
      const result = applyProductEditorAction(
        stateRef.current,
        values,
        intent,
        new Date().toISOString(),
      );

      if (!result.ok) return result;
      commit(result.value.state);
      return { ok: true, value: result.value.action };
    },
    [commit],
  );

  const transitionIntake = useCallback(
    (productId: string, nextStage: IntakeStage): IntakeActionResult => {
      const result = applyIntakeTransition(
        stateRef.current,
        productId,
        nextStage,
        new Date().toISOString(),
      );

      if (!result.ok) return result;
      commit(result.value.state);
      return { ok: true, value: result.value.action };
    },
    [commit],
  );

  const resetPrototypeState = useCallback(() => {
    commit(normalizedInitialState);
  }, [commit, normalizedInitialState]);

  const value = useMemo<ControlRoomContextValue>(
    () => ({ state, saveProduct, transitionIntake, resetPrototypeState }),
    [state, saveProduct, transitionIntake, resetPrototypeState],
  );

  return <ControlRoomContext value={value}>{children}</ControlRoomContext>;
}

export function useControlRoom() {
  const context = use(ControlRoomContext);
  if (!context) {
    throw new Error("useControlRoom must be used inside ControlRoomProvider");
  }
  return context;
}

function normalizeState(initialState: ControlRoomState): ControlRoomState {
  let index = 0;
  const idFactory = (prefix: string) => `${prefix}-seed-${++index}`;

  return {
    ...initialState,
    intake: createInitialIntakeRecords(
      initialState.products,
      initialState.intake,
      initialState.asOf,
      idFactory,
    ),
  };
}
