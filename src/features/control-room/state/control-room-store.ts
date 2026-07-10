import {
  applyCreateCatalogueTaxonomy,
  applyDeleteCatalogueTaxonomy,
  applyRenameCatalogueTaxonomy,
  hydrateCatalogueTaxonomy,
  type CatalogueTaxonomyActionError,
  type CatalogueTaxonomyActionSuccess,
  type CatalogueTaxonomyInput,
} from "@/lib/control-room/catalogue-taxonomy";
import { applyAddCustomerNote } from "@/lib/control-room/customer-actions";
import { hydrateCustomerProfiles } from "@/lib/control-room/customer-profile-seed";
import type {
  AddCustomerNoteInput,
  CustomerActionError,
  CustomerNoteActionSuccess,
} from "@/lib/control-room/customer-types";
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
import { applySaveStoreSettings } from "@/lib/control-room/settings-actions";
import { createDefaultStoreSettings } from "@/lib/control-room/settings-defaults";
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
  SaveStoreSettingsInput,
  StoreSettingsActionError,
  StoreSettingsActionSuccess,
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
type CustomerNoteResult = Result<
  CustomerNoteActionSuccess,
  CustomerActionError
>;
type StoreSettingsResult = Result<
  StoreSettingsActionSuccess,
  StoreSettingsActionError
>;
type CatalogueTaxonomyResult = Result<
  CatalogueTaxonomyActionSuccess,
  CatalogueTaxonomyActionError
>;

export type ControlRoomStore = {
  getSnapshot: () => ControlRoomState;
  subscribe: (listener: () => void) => () => void;
  saveProduct: (
    values: ProductEditorValues,
    intent: ProductEditorIntent,
  ) => ProductActionResult;
  createCatalogueTaxonomy: (input: CatalogueTaxonomyInput) => CatalogueTaxonomyResult;
  renameCatalogueTaxonomy: (
    taxonomyId: string,
    name: string,
  ) => CatalogueTaxonomyResult;
  deleteCatalogueTaxonomy: (taxonomyId: string) => CatalogueTaxonomyResult;
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
  addCustomerNote: (input: AddCustomerNoteInput) => CustomerNoteResult;
  saveStoreSettings: (input: SaveStoreSettingsInput) => StoreSettingsResult;
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
    createCatalogueTaxonomy(input) {
      return commitAction(applyCreateCatalogueTaxonomy(state, input, getNow()));
    },
    renameCatalogueTaxonomy(taxonomyId, name) {
      return commitAction(
        applyRenameCatalogueTaxonomy(state, taxonomyId, name, getNow()),
      );
    },
    deleteCatalogueTaxonomy(taxonomyId) {
      return commitAction(
        applyDeleteCatalogueTaxonomy(state, taxonomyId, getNow()),
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
    addCustomerNote(input) {
      return commitAction(applyAddCustomerNote(state, input, getNow()));
    },
    saveStoreSettings(input) {
      return commitAction(applySaveStoreSettings(state, input, getNow()));
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
    catalogueTaxonomy: hydrateCatalogueTaxonomy(
      initialState.products,
      initialState.catalogueTaxonomy,
      initialState.asOf,
      idFactory,
    ),
    customers: hydrateCustomerProfiles(initialState.customers),
    settings:
      initialState.settings ?? createDefaultStoreSettings(initialState.asOf),
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
