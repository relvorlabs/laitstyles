import {
  applyCreateCatalogueTaxonomy,
  applyDeleteCatalogueTaxonomy,
  applyRenameCatalogueTaxonomy,
  type CatalogueTaxonomyActionError,
  type CatalogueTaxonomyActionSuccess,
  type CatalogueTaxonomyInput,
  hydrateCatalogueTaxonomy,
} from "@/lib/admin/catalogue-taxonomy";
import { applyAddCustomerNote } from "@/lib/admin/customer-actions";
import { hydrateCustomerProfiles } from "@/lib/admin/customer-profile-seed";
import type {
  AddCustomerNoteInput,
  CustomerActionError,
  CustomerNoteActionSuccess,
} from "@/lib/admin/customer-types";
import {
  applyHoldConversion,
  applyHoldExtension,
  applyHoldRelease,
} from "@/lib/admin/hold-actions";
import { applyOfflineSale } from "@/lib/admin/offline-sale-actions";
import { applyOrderTransition } from "@/lib/admin/order-actions";
import {
  applyIntakeTransition,
  applyProductEditorAction,
  createInitialIntakeRecords,
} from "@/lib/admin/product-editor-actions";
import {
  applyArchiveProduct,
  applyDeleteProduct,
  applyRestoreProduct,
  type ProductLifecycleActionError,
  type ProductLifecycleActionSuccess,
} from "@/lib/admin/product-lifecycle-actions";
import type { Result } from "@/lib/admin/result";
import { applyCreateReturn, applyReturnTransition } from "@/lib/admin/return-actions";
import { applySaveStoreSettings } from "@/lib/admin/settings-actions";
import { createDefaultStoreSettings } from "@/lib/admin/settings-defaults";
import type {
  AdminState,
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
} from "@/lib/admin/types";

type ProductActionResult = Result<ProductEditorActionSuccess, ProductEditorActionError>;
type ProductLifecycleResult = Result<ProductLifecycleActionSuccess, ProductLifecycleActionError>;
type IntakeActionResult = Result<IntakeTransitionSuccess, ProductEditorActionError>;
type OrderActionResult = Result<OrderTransitionSuccess, SalesActionError>;
type HoldResult = Result<HoldActionSuccess, SalesActionError>;
type OfflineSaleResult = Result<OfflineSaleSuccess, SalesActionError>;
type ReturnResult = Result<ReturnActionSuccess, SalesActionError>;
type CustomerNoteResult = Result<CustomerNoteActionSuccess, CustomerActionError>;
type StoreSettingsResult = Result<StoreSettingsActionSuccess, StoreSettingsActionError>;
type CatalogueTaxonomyResult = Result<CatalogueTaxonomyActionSuccess, CatalogueTaxonomyActionError>;

export type AdminStore = {
  getSnapshot: () => AdminState;
  subscribe: (listener: () => void) => () => void;
  saveProduct: (values: ProductEditorValues, intent: ProductEditorIntent) => ProductActionResult;
  archiveProduct: (productId: string) => ProductLifecycleResult;
  restoreProduct: (productId: string) => ProductLifecycleResult;
  deleteProduct: (productId: string) => ProductLifecycleResult;
  createCatalogueTaxonomy: (input: CatalogueTaxonomyInput) => CatalogueTaxonomyResult;
  renameCatalogueTaxonomy: (taxonomyId: string, name: string) => CatalogueTaxonomyResult;
  deleteCatalogueTaxonomy: (taxonomyId: string) => CatalogueTaxonomyResult;
  transitionIntake: (productId: string, nextStage: IntakeStage) => IntakeActionResult;
  transitionOrder: (orderId: string, nextStatus: OrderStatus) => OrderActionResult;
  extendHold: (holdId: string, minutes: number) => HoldResult;
  releaseHold: (holdId: string) => HoldResult;
  convertHold: (input: ConvertHoldInput) => HoldResult;
  recordOfflineSale: (input: OfflineSaleInput) => OfflineSaleResult;
  createReturn: (input: CreateReturnInput) => ReturnResult;
  transitionReturn: (returnId: string, nextStatus: ReturnStatus) => ReturnResult;
  addCustomerNote: (input: AddCustomerNoteInput) => CustomerNoteResult;
  saveStoreSettings: (input: SaveStoreSettingsInput) => StoreSettingsResult;
  resetPrototypeState: () => void;
};

export function createAdminStore(initialState: AdminState, now?: () => string): AdminStore {
  const normalizedInitialState = normalizeState(initialState);
  const getNow = now ?? createSessionClock(normalizedInitialState.asOf);
  let state = normalizedInitialState;
  const listeners = new Set<() => void>();

  function emit(nextState: AdminState) {
    state = nextState;
    for (const listener of listeners) listener();
  }

  function commitAction<TAction, TError>(
    result: Result<{ state: AdminState; action: TAction }, TError>,
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
      return commitAction(applyProductEditorAction(state, values, intent, getNow()));
    },
    archiveProduct(productId) {
      return commitAction(applyArchiveProduct(state, productId, getNow()));
    },
    restoreProduct(productId) {
      return commitAction(applyRestoreProduct(state, productId, getNow()));
    },
    deleteProduct(productId) {
      return commitAction(applyDeleteProduct(state, productId, getNow()));
    },
    createCatalogueTaxonomy(input) {
      return commitAction(applyCreateCatalogueTaxonomy(state, input, getNow()));
    },
    renameCatalogueTaxonomy(taxonomyId, name) {
      return commitAction(applyRenameCatalogueTaxonomy(state, taxonomyId, name, getNow()));
    },
    deleteCatalogueTaxonomy(taxonomyId) {
      return commitAction(applyDeleteCatalogueTaxonomy(state, taxonomyId, getNow()));
    },
    transitionIntake(productId, nextStage) {
      return commitAction(applyIntakeTransition(state, productId, nextStage, getNow()));
    },
    transitionOrder(orderId, nextStatus) {
      return commitAction(applyOrderTransition(state, orderId, nextStatus, getNow()));
    },
    extendHold(holdId, minutes) {
      return commitAction(applyHoldExtension(state, holdId, minutes, getNow()));
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
      return commitAction(applyReturnTransition(state, returnId, nextStatus, getNow()));
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

function normalizeState(initialState: AdminState): AdminState {
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
    settings: initialState.settings ?? createDefaultStoreSettings(initialState.asOf),
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

  return () => new Date(anchorTime + Math.max(0, Date.now() - startedAt)).toISOString();
}

/** @deprecated Use AdminStore. */
export type ControlRoomStore = AdminStore;
/** @deprecated Use createAdminStore. */
export const createControlRoomStore = createAdminStore;
