import {
  applyIntakeTransition,
  applyProductEditorAction,
  createInitialIntakeRecords,
} from "@/lib/control-room/product-editor-actions";
import type { Result } from "@/lib/control-room/result";
import type {
  ControlRoomState,
  IntakeStage,
  IntakeTransitionSuccess,
  ProductEditorActionError,
  ProductEditorActionSuccess,
  ProductEditorIntent,
  ProductEditorValues,
} from "@/lib/control-room/types";

type ProductActionResult = Result<
  ProductEditorActionSuccess,
  ProductEditorActionError
>;

type IntakeActionResult = Result<
  IntakeTransitionSuccess,
  ProductEditorActionError
>;

export type ControlRoomStore = {
  getSnapshot: () => ControlRoomState;
  subscribe: (listener: () => void) => () => void;
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

export function createControlRoomStore(
  initialState: ControlRoomState,
  now: () => string = () => new Date().toISOString(),
): ControlRoomStore {
  const normalizedInitialState = normalizeState(initialState);
  let state = normalizedInitialState;
  const listeners = new Set<() => void>();

  function emit(nextState: ControlRoomState) {
    state = nextState;
    for (const listener of listeners) listener();
  }

  return {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    saveProduct(values, intent) {
      const result = applyProductEditorAction(state, values, intent, now());
      if (!result.ok) return result;

      emit(result.value.state);
      return { ok: true, value: result.value.action };
    },
    transitionIntake(productId, nextStage) {
      const result = applyIntakeTransition(state, productId, nextStage, now());
      if (!result.ok) return result;

      emit(result.value.state);
      return { ok: true, value: result.value.action };
    },
    resetPrototypeState() {
      emit(normalizedInitialState);
    },
  };
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
