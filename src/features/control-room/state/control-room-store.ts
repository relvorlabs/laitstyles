import {
  applyHoldConversion,
  applyHoldExtension,
  applyHoldRelease,
} from "@/lib/control-room/hold-actions";
import { applyOfflineSale } from "@/lib/control-room/offline-sale-actions";
import { applyOrderTransition } from "@/lib/control-room/order-actions";
import {
  applyIntakeTransition,
  applyProductEditorAction,
  createInitialIntakeRecords,
} from "@/lib/control-room/product-editor-actions";
import {
  applyCreateReturn,
  applyReturnTransition,
} from "@/lib/control-room/return-actions";
import type { Result } from "@/lib/control-room/result";
import type {
  ControlRoomState,
  ConvertHoldInput,
  CreateReturnInput,
  HoldActionSuccess,
  IntakeStage,
  IntakeTransitionSuccess,
  OfflineSaleInput,
  OfflineSaleSuccess,
  OrderStatus,
  OrderTransitionSuccess,
  ProductEditorActionError,
  ProductEditorActionSuccess,
  ProductEditorIntent,
  ProductEditorValues,
  ReturnActionSuccess,
  ReturnStatus,
  SalesActionError,
} from "@/lib/control-room/types";

type ProductActionResult = Result<
  ProductEditorActionSuccess,
  ProductEditorActionError
>;

type IntakeActionResult = Result<
  IntakeTransitionSuccess,
  ProductEditorActionError
>;

type OrderActionResult = Result<OrderTransitionSuccess, SalesActionError>;
type HoldResult = Result<HoldActionSuccess, SalesActionError>;
type OfflineSaleResult = Result<OfflineSaleSuccess, SalesActionError>;
type ReturnResult = Result<ReturnActionSuccess, SalesActionError>;

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
  transitionOrder: (
    orderId: string,
    nextStatus: OrderStatus,
  ) => OrderActionResult;
  extendHold: (holdId: string, minutes: number) => HoldResult;
  releaseHold: (holdId: string) => HoldResult;
  convertHold: (input: ConvertHoldInput) => HoldResult;
  recordOfflineSale: (input: OfflineSaleInput) => OfflineSaleResult;
  createReturn: (input: CreateReturnInput) => ReturnResult;
  transitionReturn: (
    returnId: string,
    nextStatus: ReturnStatus,
  ) => ReturnResult;
  resetPrototypeState: () => void;
};

export function createControlRoomStore(
  initialState: ControlRoomState,
  now?: () => string,
): ControlRoomStore {
  const normalizedInitialState = normalizeState(initialState);
  const getNow = now ?? createSessionClock(normalizedInitialState.asOf);
  let state = normalizedInitialState;
  const listeners = new Set<() => void>();

  function emit(nextState: ControlRoomState) {
    state = nextState;
    for (const listener of listeners) listener();
  }

  function commitAction<TAction, TError>(
    result: Result<{ state: ControlRoomState; action: TAction }, TError>,
  ): Result<TAction, TError> {
    if (!result.ok) return result;
    emit(result.value.state);
    return { ok: true, value: result.value.action };
  }

  return {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    saveProduct(values, intent) {
      return commitAction(
        applyProductEditorAction(state, values, intent, getNow()),
      );
    },
    transitionIntake(productId, nextStage) {
      return commitAction(
        applyIntakeTransition(state, productId, nextStage, getNow()),
      );
    },
    transitionOrder(orderId, nextStatus) {
      return commitAction(
        applyOrderTransition(state, orderId, nextStatus, getNow()),
      );
    },
    extendHold(holdId, minutes) {
      return commitAction(
        applyHoldExtension(state, holdId, minutes, getNow()),
      );
    },
    releaseHold(holdId) {
      return commitAction(applyHoldRelease(state, holdId, getNow()));
    },
    convertHold(input) {
      return commitAction(applyHoldConversion(state, input, getNow()));
    },
    recordOfflineSale(input) {
      return commitAction(applyOfflineSale(state, input, getNow()));
    },
    createReturn(input) {
      return commitAction(applyCreateReturn(state, input, getNow()));
    },
    transitionReturn(returnId, nextStatus) {
      return commitAction(
        applyReturnTransition(state, returnId, nextStatus, getNow()),
      );
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
    returns: initialState.returns ?? [],
  };
}

function createSessionClock(anchor: string) {
  const anchorTime = Date.parse(anchor);
  const startedAt = Date.now();

  return () =>
    new Date(anchorTime + Math.max(0, Date.now() - startedAt)).toISOString();
}
